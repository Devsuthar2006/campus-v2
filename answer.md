Proceed with the asynchronous `StorageProvider` refactor only. Do **not** implement the GCS provider yet.

One important correction: the deployment target is **Google Compute Engine (GCE) on a single VM**, not Cloud Run. The deployment strategy has changed.

For authentication, use **Google Application Default Credentials (ADC)** as the primary authentication model.

Requirements:

* **Production (GCE VM):** authenticate using the VM's attached service account via ADC. Do **not** require a mounted service-account key file.
* **Local development:** support `GOOGLE_APPLICATION_CREDENTIALS` pointing to a service account JSON file for developers who are not running on GCP. This should be optional and only used when ADC is unavailable.
* Initialize the Google Cloud Storage SDK using ADC (optionally with `projectId` from configuration), and avoid hardcoded credential paths or assumptions about key files.
* Keep the implementation cloud-agnostic where possible and follow Google's recommended authentication practices.

For this task, only complete the asynchronous `StorageProvider` refactor. Do not implement the GCS provider, modify API contracts, or introduce unrelated changes.

At the end, confirm that:

* the project behavior remains unchanged,
* all storage call sites have been updated correctly,
* the codebase is ready for the next task: implementing the Google Cloud Storage provider using ADC on GCE.
