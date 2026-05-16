(function () {
  const PUBLIC_KEY_PEM = [
    '-----BEGIN PUBLIC KEY-----',
    'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEijFOKlPfzCxdayi6ehRgi7+v1Ctf',
    'aGg7OjkvEnMMkibIFv6pXPDQ3T3K0vN/BiFhfbSw/4hNS+FQEtUqtgQ/Iw==',
    '-----END PUBLIC KEY-----'
  ].join('\n');

  let cachedMachineId = null;
  let cachedPublicKey = null;

  function normalize(value) {
    return String(value ?? '').trim();
  }

  function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function base64UrlToBytes(base64Url) {
    const normalized = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return base64ToBytes(padded);
  }

  function pemToBuffer(pem) {
    const clean = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
    return base64ToBytes(clean).buffer;
  }

  async function importPublicKey() {
    if (cachedPublicKey) return cachedPublicKey;
    cachedPublicKey = await window.crypto.subtle.importKey(
      'spki',
      pemToBuffer(PUBLIC_KEY_PEM),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );
    return cachedPublicKey;
  }

  async function getMachineId() {
    if (cachedMachineId) return cachedMachineId;
    if (!window.desktop?.getMachineId) {
      throw new Error('No se pudo obtener el ID_PC desde Electron.');
    }
    cachedMachineId = normalize(await window.desktop.getMachineId()).toUpperCase();
    return cachedMachineId;
  }

  function parseLicenseCode(licenseCode) {
    const raw = normalize(licenseCode).replace(/\s+/g, '');
    const parts = raw.split('|');
    if (parts.length !== 4) throw new Error('Formato de licencia inválido.');

    const [machineId, expiryDate, plan, signature] = parts.map(normalize);
    if (!machineId || !expiryDate || !plan || !signature) {
      throw new Error('La licencia está incompleta.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
      throw new Error('La fecha debe tener formato YYYY-MM-DD.');
    }

    return {
      raw,
      machineId: machineId.toUpperCase(),
      expiryDate,
      plan: plan.toUpperCase(),
      signature,
      payload: `${machineId.toUpperCase()}|${expiryDate}|${plan.toUpperCase()}`
    };
  }

  function getExpiryTimestamp(expiryDate) {
    return new Date(`${expiryDate}T23:59:59`).getTime();
  }

  async function verifyLicense(licenseCode) {
    const parsed = parseLicenseCode(licenseCode);
    const currentMachineId = await getMachineId();

    if (parsed.machineId !== currentMachineId) {
      throw new Error('La licencia no corresponde a esta PC.');
    }

    const expiry = getExpiryTimestamp(parsed.expiryDate);
    if (Number.isNaN(expiry) || expiry < Date.now()) {
      throw new Error('La licencia está vencida.');
    }

    const publicKey = await importPublicKey();
    const signatureBytes = base64UrlToBytes(parsed.signature);
    const data = new TextEncoder().encode(parsed.payload);
    const isValid = await window.crypto.subtle.verify(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      publicKey,
      signatureBytes,
      data
    );

    if (!isValid) throw new Error('La firma digital no es válida.');
    return parsed;
  }

  async function readActivationRecord() {
    const data = await window.desktop?.readData?.();
    return data?.activation || null;
  }

  async function saveActivationRecord(licenseCode, parsed) {
    const data = await window.desktop.readData();
    const nextData = {
      ...data,
      activation: {
        licenseCode,
        machineId: parsed.machineId,
        expiryDate: parsed.expiryDate,
        plan: parsed.plan,
        activatedAt: new Date().toISOString()
      }
    };
    const result = await window.desktop.writeData(nextData);
    if (!result?.ok) throw new Error('No se pudo guardar la activación local.');
  }

  async function clearActivationRecord() {
    const data = await window.desktop.readData();
    const nextData = { ...data, activation: null };
    await window.desktop.writeData(nextData);
  }

  function setStatus(message, type) {
    const node = document.getElementById('activationStatus');
    if (!node) return;
    node.textContent = message || '';
    node.className = `activation-status${type ? ` ${type}` : ''}`;
  }

  function showAppShell() {
    document.getElementById('activationGate')?.classList.add('hidden');
    document.getElementById('appShell')?.classList.remove('hidden');
  }

  function showActivationGate() {
    document.getElementById('activationGate')?.classList.remove('hidden');
    document.getElementById('appShell')?.classList.add('hidden');
  }

  async function fillMachineId() {
    const machineId = await getMachineId();
    document.querySelectorAll('[data-machine-id]').forEach((node) => {
      if ('value' in node) node.value = machineId;
      else node.textContent = machineId;
    });
  }

  async function validateStoredActivation() {
    const stored = await readActivationRecord();
    if (!stored?.licenseCode) return false;

    try {
      const parsed = await verifyLicense(stored.licenseCode);
      await saveActivationRecord(stored.licenseCode, parsed);
      return true;
    } catch (_) {
      await clearActivationRecord();
      return false;
    }
  }

  function bindActivationUi() {
    document.getElementById('copyMachineIdButton')?.addEventListener('click', async () => {
      try {
        const machineId = await getMachineId();
        if (window.electron?.clipboard?.writeText) {
          window.electron.clipboard.writeText(machineId);
        } else {
          await navigator.clipboard.writeText(machineId);
        }
        setStatus('ID_PC copiado.', 'ok');
      } catch (e) {
        setStatus(`No se pudo copiar el ID_PC: ${e.message}`, 'error');
      }
    });

    document.getElementById('activateLicenseButton')?.addEventListener('click', async () => {
      const input = document.getElementById('licenseCodeInput');
      const licenseCode = input?.value || '';
      setStatus('Validando licencia...', 'info');

      try {
        const parsed = await verifyLicense(licenseCode);
        await saveActivationRecord(licenseCode, parsed);
        setStatus(`Licencia ${parsed.plan} activada hasta ${parsed.expiryDate}.`, 'ok');
        showAppShell();
      } catch (e) {
        await clearActivationRecord();
        setStatus(e.message || 'No se pudo activar la licencia.', 'error');
      }
    });
  }

  async function initLicenseGate() {
    try {
      await fillMachineId();
      bindActivationUi();
      const active = await validateStoredActivation();
      if (active) showAppShell();
      else showActivationGate();
    } catch (e) {
      showActivationGate();
      setStatus(e.message || 'No se pudo inicializar la activación.', 'error');
    }
  }

  window.LicenseGate = {
    getMachineId,
    verifyLicense
  };

  document.addEventListener('DOMContentLoaded', initLicenseGate);
})();
