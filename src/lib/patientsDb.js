const DB_NAME = 'physio-doc-local';
const DB_VERSION = 2;
const PATIENT_STORE = 'patients';
const PRESCRIPTION_STORE = 'prescriptions';
const META_STORE = 'meta';
const LAST_OPENED_KEY = 'lastOpenedPatientIds';
const MAX_RECENT = 5;

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(PATIENT_STORE)) {
        const patientStore = db.createObjectStore(PATIENT_STORE, { keyPath: 'id' });
        patientStore.createIndex('lastName', 'lastName', { unique: false });
      }

      if (!db.objectStoreNames.contains(PRESCRIPTION_STORE)) {
        const prescriptionStore = db.createObjectStore(PRESCRIPTION_STORE, { keyPath: 'id' });
        prescriptionStore.createIndex('patientId', 'patientId', { unique: false });
        prescriptionStore.createIndex('issueDate', 'issueDate', { unique: false });
      }

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(request.error?.message || 'Datenbank konnte nicht geöffnet werden.'));
  });
}

function getRequestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(request.error?.message || 'Datenbankabfrage fehlgeschlagen.'));
  });
}

export async function getAllPatients() {
  try {
    const db = await openDb();
    const tx = db.transaction(PATIENT_STORE, 'readonly');
    const store = tx.objectStore(PATIENT_STORE);
    const patients = await getRequestResult(store.getAll());

    return patients.sort((a, b) => {
      const byLastName = a.lastName.localeCompare(b.lastName, 'de');
      if (byLastName !== 0) return byLastName;
      return a.firstName.localeCompare(b.firstName, 'de');
    });
  } catch (error) {
    throw new Error(`Patienten konnten nicht geladen werden: ${error.message}`);
  }
}

export async function getPatientById(id) {
  try {
    const db = await openDb();
    const tx = db.transaction(PATIENT_STORE, 'readonly');
    const store = tx.objectStore(PATIENT_STORE);
    return await getRequestResult(store.get(id));
  } catch (error) {
    throw new Error(`Patient konnte nicht geladen werden: ${error.message}`);
  }
}

export async function savePatient(patientInput) {
  const now = new Date().toISOString();
  const patient = {
    ...patientInput,
    id: patientInput.id || crypto.randomUUID(),
    updatedAt: now,
    createdAt: patientInput.createdAt || now,
  };

  try {
    const db = await openDb();
    const tx = db.transaction(PATIENT_STORE, 'readwrite');
    tx.objectStore(PATIENT_STORE).put(patient);

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(new Error(tx.error?.message || 'Datenbank-Transaktion fehlgeschlagen.'));
    });

    return patient;
  } catch (error) {
    throw new Error(`Patient konnte nicht gespeichert werden: ${error.message}`);
  }
}

export async function deletePatient(id) {
  try {
    const db = await openDb();
    const tx = db.transaction([PATIENT_STORE, PRESCRIPTION_STORE], 'readwrite');
    tx.objectStore(PATIENT_STORE).delete(id);

    const prescriptionStore = tx.objectStore(PRESCRIPTION_STORE);
    const index = prescriptionStore.index('patientId');
    const request = index.openCursor(IDBKeyRange.only(id));

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      prescriptionStore.delete(cursor.primaryKey);
      cursor.continue();
    };

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(new Error(tx.error?.message || 'Patient konnte nicht gelöscht werden.'));
    });
  } catch (error) {
    throw new Error(`Patient konnte nicht gelöscht werden: ${error.message}`);
  }
}

export async function markPatientAsRecentlyOpened(id) {
  try {
    const db = await openDb();
    const tx = db.transaction(META_STORE, 'readwrite');
    const store = tx.objectStore(META_STORE);

    const existing = await getRequestResult(store.get(LAST_OPENED_KEY));
    const previous = Array.isArray(existing?.value) ? existing.value : [];
    const next = [id, ...previous.filter(item => item !== id)].slice(0, MAX_RECENT);

    store.put({ key: LAST_OPENED_KEY, value: next });

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(new Error(tx.error?.message || 'Zuletzt-geöffnet-Liste konnte nicht aktualisiert werden.'));
    });

    return next;
  } catch (error) {
    throw new Error(`Zuletzt geöffneter Patient konnte nicht gespeichert werden: ${error.message}`);
  }
}

export async function getRecentlyOpenedPatients() {
  try {
    const db = await openDb();
    const tx = db.transaction([META_STORE, PATIENT_STORE], 'readonly');
    const metaStore = tx.objectStore(META_STORE);
    const patientStore = tx.objectStore(PATIENT_STORE);

    const recentsEntry = await getRequestResult(metaStore.get(LAST_OPENED_KEY));
    const recentIds = Array.isArray(recentsEntry?.value) ? recentsEntry.value : [];

    const patients = await Promise.all(recentIds.map(id => getRequestResult(patientStore.get(id))));
    return patients.filter(Boolean);
  } catch (error) {
    throw new Error(`Zuletzt geöffnete Patienten konnten nicht geladen werden: ${error.message}`);
  }
}

export async function getPrescriptionsByPatientId(patientId) {
  try {
    const db = await openDb();
    const tx = db.transaction(PRESCRIPTION_STORE, 'readonly');
    const store = tx.objectStore(PRESCRIPTION_STORE);
    const index = store.index('patientId');
    const prescriptions = await getRequestResult(index.getAll(patientId));

    return prescriptions.sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  } catch (error) {
    throw new Error(`Verordnungen konnten nicht geladen werden: ${error.message}`);
  }
}

export async function getPrescriptionById(id) {
  try {
    const db = await openDb();
    const tx = db.transaction(PRESCRIPTION_STORE, 'readonly');
    const store = tx.objectStore(PRESCRIPTION_STORE);
    return await getRequestResult(store.get(id));
  } catch (error) {
    throw new Error(`Verordnung konnte nicht geladen werden: ${error.message}`);
  }
}

export async function savePrescription(prescriptionInput) {
  const now = new Date().toISOString();
  const prescription = {
    ...prescriptionInput,
    id: prescriptionInput.id || crypto.randomUUID(),
    updatedAt: now,
    createdAt: prescriptionInput.createdAt || now,
  };

  try {
    const db = await openDb();
    const tx = db.transaction(PRESCRIPTION_STORE, 'readwrite');
    tx.objectStore(PRESCRIPTION_STORE).put(prescription);

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(new Error(tx.error?.message || 'Datenbank-Transaktion fehlgeschlagen.'));
    });

    return prescription;
  } catch (error) {
    throw new Error(`Verordnung konnte nicht gespeichert werden: ${error.message}`);
  }
}
