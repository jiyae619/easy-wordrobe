# Eval fixtures

Drop labeled clothing photos in this folder.

Each fixture is a pair:

```
fixtures/
  navy-tee.jpg
  navy-tee.json
  olive-chinos.jpg
  olive-chinos.json
```

The JSON sidecar is the ground truth the eval scores against.

## Sidecar schema

```json
{
  "expectedCategory": "tops",
  "expectedColorHex": "#1B2A4A",
  "subcategoryKeywords": ["tee", "t-shirt", "crew"],
  "expectedMoods": ["casual"],
  "expectedSeasons": ["spring", "summer"],
  "notes": "Plain navy crew-neck tee, white background"
}
```

| Field | Required | Meaning |
|---|---|---|
| `expectedCategory` | yes | One of `tops`, `bottoms`, `outerwear`, `dresses` |
| `expectedColorHex` | yes | Ground truth dominant color hex — scored as RGB Euclidean distance, lower is better |
| `subcategoryKeywords` | yes | Any of these words in the model's `subcategory` string scores as a hit (case-insensitive) |
| `expectedMoods` | optional | Subset of `professional`, `casual`, `sporty`, `creative`, `romantic`. Scored as Jaccard overlap |
| `expectedSeasons` | optional | Subset of `spring`, `summer`, `fall`, `winter`. Scored as Jaccard overlap |
| `notes` | optional | Human notes for your own reference |

## Building a good fixture set

- **15–30 images** is enough to spot real differences; under 10 is noise.
- **Cover the long tail**, not just easy cases — patterned items, busy backgrounds, mannequins vs flat-lay, partial occlusion, multi-item shots.
- **Include known-hard cases**: navy-vs-black, off-white-vs-cream, jacket-vs-cardigan.
- Image files: jpg or png, ideally what your real users upload (phone camera, not studio shots).
