# Fish name data

The game contains a snapshot of 3,000 accepted, named fish species from **The European Nucleotide Archive (ENA) taxonomy**, delivered through the GBIF Species API, plus a small curated list of Japanese common names and their scientific names. Duplicate scientific names are merged. Scientific names without a Japanese label are displayed as scientific names, never as invented Japanese names.

- Source: https://www.gbif.org/dataset/6b6b2923-0a10-4708-b170-5b7c611aceef
- Citation: Riviere S (2010). The European Nucleotide Archive (ENA) taxonomy. European Nucleotide Archive (EMBL-EBI). https://doi.org/10.15468/avkgwm
- Retrieved: 2026-10-30
- License: Creative Commons Attribution 4.0, https://creativecommons.org/licenses/by/4.0/
- Snapshot metadata: `docs/fish-source.json`
- Reproducible import: `python scripts/import-fish.py`

The import accepts rank SPECIES, status ACCEPTED, type SCIENTIFIC, a named genus/family, and a canonical binomial. Environmental samples, unnamed species and operational taxonomic units are excluded. These are real fish names, not a claim of an exhaustive or current global fish checklist. The snapshot includes marine and freshwater fish.

Only names and classification are sourced. Colors, illustrations, sizes, behavior, rewards and depth bands are procedural game design, not scientific descriptions of the species' real habitats. No photographs or third-party illustrations are copied. The code's MIT license does not replace the data attribution above.

Previous fictional fish records remain stored under the previous version's browser keys. The real-fish catalogue starts separately; fictional entries are not silently renamed to real species.
