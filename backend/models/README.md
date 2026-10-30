# Model files

Model checkpoints (`.pth`) and retrieval indexes (`.index`) are intentionally
not included in the public repository. Place RVC v1/v2 files you have the
right to use in this folder. The default startup voice is `nyamura-ru.pth`;
without it, Tembr loads the first available `.pth` model.

The index is optional. If present, select a matching `added_*.index` file
alongside its checkpoint when uploading through the UI, or place both files
here before startup.
