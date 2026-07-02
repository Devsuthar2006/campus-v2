Excellent implementation.

Before we move on, perform one verification regarding IAM permissions.

You mentioned that the GCE VM's attached service account may require:

`roles/iam.serviceAccountTokenCreator`

Please verify this against the behavior of the official `@google-cloud/storage` SDK when generating V4 signed URLs using Application Default Credentials on a Google Compute Engine VM.

Specifically determine:

* Whether this role is actually required.
* Under what circumstances it is required.
* Whether the SDK signs locally or calls the IAM Credentials SignBlob API when using ADC on GCE.
* The minimum IAM roles required for:

  * generating signed upload URLs,
  * generating signed download URLs,
  * deleting objects.

If any earlier assumptions are incorrect, update the implementation notes only. Do not modify the code unless a genuine implementation issue is discovered.
