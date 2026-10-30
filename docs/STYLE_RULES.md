# Stylemax style rules

<!-- Generated from src/data/moodStyles.ts and src/data/weatherStyles.ts by src/data/styleRulesDoc.ts. Do not edit by hand: run `npm run docs:style-rules`. A test fails when this file is out of date. -->

How the Stylist decides what fits a mood and today's weather. Code scores every piece against these rules and removes the ones that clash before the AI picks outfits, then checks every outfit for what the weather requires. See AGENTS.md for how this fits into the agents.

## Sources

- **Subjective style, measured by people.** Hipster Wars (Kiapour et al., ECCV 2014) found that 1–10 style ratings were unstable, so it asked "which of these two is more preppy?" and ranked from the comparisons. FashionStyle14 (Takagi et al., 2017) labeled about 13,000 images into 14 styles by experts. *Use:* Not used yet. Swipes (wear vs skip) are the same kind of pairwise judgment and could tune scores per person later. [Hipster Wars](https://acberg.com/papers/hipster_eccv14.pdf) · [FashionStyle14](https://openaccess.thecvf.com/content_ICCV_2017_workshops/papers/w32/Takagi_What_Makes_a_ICCV_2017_paper.pdf)
- **A vocabulary for garments.** Fashionpedia (Jia et al., ECCV 2020): an expert ontology of 27 garment types, 19 parts and 294 attributes (silhouette, material, neckline). *Use:* Model for the keyword lists: rules match garment type and material words. IntakeAgent names the material in the subcategory so they can match. [Fashionpedia](https://arxiv.org/pdf/2004.12276)
- **What goes with what.** Polyvore Outfits (Vasileva et al., ECCV 2018): about 68,000 user-assembled outfits for learning type-aware compatibility. *Use:* Not used: needs a trained model. [Type-aware embeddings](https://openaccess.thecvf.com/content_ECCV_2018/html/Mariya_Vasileva_Learning_Type-Aware_Embeddings_ECCV_2018_paper.html)
- **Color and mood.** Kobayashi's Color Image Scale maps 130 colors and 1,000+ combinations to 180 mood words on warm–cool, soft–hard and clear–grayish axes. *Use:* Not used yet; the principled replacement for the short color help / hurt lists. [Color Image Scale](https://www.goodreads.com/book/show/2151010.Color_Image_Scale)
- **Professional = business casual.** Dress-code guides: chinos, dress trousers, knee or midi skirts, collared shirts, blouses, sweaters, blazers, loafers; no jeans, sneakers, sandals, shorts, graphic or plain tees. *Use:* Professional's keyword lists. [SEEK](https://www.seek.co.nz/career-advice/article/a-guide-to-business-casual-attire-with-examples) · [What not to wear](https://ultimatemedical.edu/blog/what-not-to-wear-in-a-business-casual-office)
- **Special day and Casual.** Special day replaces Romantic (whose rules mostly fit women's clothes) with occasion and cocktail dress codes for everyone. Athleisure guides (joggers, leggings, hoodies, track pieces) now feed Casual, since Sporty is retired. *Use:* Special day's keyword lists and colors; athleisure terms in Casual. Items tagged Romantic count as Special day. [Romantic style (Stitch Fix)](https://stitchfix.com/women/blog/?p=76712) · [Romantic style (Lookiero)](https://lookiero.co.uk/blog/what-is-the-romantic-style) · [Athleisure (Macron)](https://www.macron.com/uk/what-is-athleisure)
- **Dressing for rain.** Wet-weather guides: skip suede, canvas and delicate fabrics, keep cotton and denim off the outer layer, wear a waterproof shell with grippy boots, knits only as a layer under the shell. *Use:* The rain rule. Leather is out in the rain on the product owner's call. [Bespoke Post](https://www.bespokepost.com/field-guide/your-five-point-plan-for-rainy-day-style) · [Permanent Style](https://www.permanentstyle.com/2022/05/rain-cap-and-cordovan-or-felt-and-suede.html) · [FashionUnited](https://fashionunited.uk/news/fashion/how-to-dress-well-on-rainy-days/2022072864350) · [ASOS](https://www.asos.com/men/fashion-feed/2025_10_27-mon/rainy-day-outfits)
- **Warmth by garment.** Clothing-insulation (clo) tables from ASHRAE 55 / ISO 9920: a T-shirt about 0.09 clo, trousers + long-sleeved shirt about 0.6, a business suit about 1.0. *Use:* Orders the temperature keyword lists. The app uses bands, not clo sums, because garment names do not say how thick a piece is. [Clothing insulation](https://en.wikipedia.org/wiki/Clothing_insulation) · [Engineering ToolBox](https://www.engineeringtoolbox.com/clo-clothing-thermal-insulation-d_732.html)

## Mood scoring

Every piece starts at 0.50 for each mood; the result is kept between 0 and 1. Keywords match the piece's name and free-form tags as whole words. One keyword rule applies, checked in this order:

| Adjustment | When |
| --- | --- |
| +0.30 | The user tagged the piece with this mood |
| −0.10 | The user tagged it with a different mood only |
| −0.45 | Name matches a "clashes" keyword (beats the tag) |
| +0.35 | Otherwise, matches a "textbook" keyword |
| +0.15 | Otherwise, matches a "works" keyword |
| ±0.05 / −0.10 | Color on the mood's help / hurt list |

0.70+ is a strong fit (outfits anchor on these). Below 0.35 a piece is off-mood and never sent to the AI, unless a group would be too thin to build looks.

## Moods

### Professional (`professional`)

Polished and office ready: business casual or sharper. Structured, tailored, understated.

- **Reach for:** blazers, button-down or oxford shirts, blouses, fine knits, turtlenecks; tailored trousers, chinos, pencil or midi skirts; sheath, shirt or wrap dresses; loafers, oxfords, pumps, ankle boots; a wool coat or trench
- **Shape and fabric:** clean lines, structured shoulders, pressed fabrics (wool, cotton poplin, silk, fine knit), knee length or longer
- **Colors:** navy, black, grey, white, cream, beige, camel and brown, with at most one muted accent
- **Breaks the mood:** hoodies and sweatshirts, athletic wear, t-shirts and graphic tees, crop or tank tops, shorts, jeans, sneakers, sandals and flip flops, hiking boots, slip dresses and sundresses
- Textbook (+0.35): `blazer`, `suit`, `sport coat`, `trouser`, `dress pant`, `khaki`, `tailored`, `slack`, `pencil`, `button-down`, `button-up`, `oxford`, `dress shirt`, `blouse`, `turtleneck`, `sheath`, `shirt dress`, `loafer`, `pump`, `derby`, `brogue`, `trench`, `wool coat`, `vest`, `waistcoat`
- Works (+0.15): `shirt`, `chino`, `cardigan`, `sweater`, `knit`, `pullover`, `midi`, `wrap dress`, `wrap`, `pleated skirt`, `skirt`, `ankle boot`, `mule`, `coat`, `polo`, `heel`, `flat`
- Clashes (−0.45): `hoodie`, `sweatshirt`, `jogger`, `legging`, `sweatpant`, `track`, `tracksuit`, `athletic`, `running`, `gym`, `graphic`, `tshirt`, `tee`, `crop`, `tank`, `cami`, `shorts`, `jean`, `ripped`, `distressed`, `cargo`, `flip-flop`, `slide`, `sandal`, `hiking`, `sneaker`, `trainer`, `slip dress`, `sundress`, `mini`, `denim jacket`, `puffer`, `windbreaker`, `fleece`
- Colors that help (+0.05): `Black`, `Navy`, `Grey`, `White`, `Cream`, `Beige`, `Brown` · hurt (−0.10): `Yellow`, `Orange`

### Casual (`casual`)

Relaxed, comfortable, everyday, athleisure included: easy pieces that still look put together.

- **Reach for:** t-shirts, sweatshirts and hoodies, knit sweaters, casual shirts, polos, cardigans, denim, utility or track jackets; jeans, chinos, joggers, leggings, shorts, casual skirts; sundresses and t-shirt dresses; sneakers, boots, sandals
- **Shape and fabric:** relaxed fits, soft cotton, denim and knits; mix one sharper piece with easy basics
- **Colors:** anything goes; denim blue, neutrals and one easy color work best
- **Breaks the mood:** full suiting, evening or cocktail pieces (sequins, satin gowns), stilettos, head to toe gym kit
- Textbook (+0.35): `tshirt`, `tee`, `jean`, `denim`, `chino`, `sweatshirt`, `hoodie`, `sneaker`, `cardigan`, `flannel`, `polo`, `sundress`, `tshirt dress`, `henley`, `overshirt`, `jumper`
- Works (+0.15): `sweater`, `knit`, `pullover`, `shirt`, `shorts`, `skirt`, `denim jacket`, `jacket`, `boot`, `sandal`, `loafer`, `puffer`, `parka`, `cargo`, `wrap dress`, `linen`, `jogger`, `legging`, `sweatpant`, `track jacket`, `zip-up`, `quarter-zip`, `fleece`, `windbreaker`, `anorak`
- Clashes (−0.45): `tuxedo`, `gown`, `cocktail`, `sequin`, `suit`, `stiletto`, `pump`, `waistcoat`
- Colors that help (+0.05): `Blue`, `Navy`, `White`, `Grey`, `Olive`, `Beige`, `Cream` · hurt (−0.10): —

### Special day (`occasion`)

Dressed up for a celebration, dinner, date or event: a clear step above everyday, polished with one special touch. For everyone.

- **Reach for:** dresses (wrap, slip, midi, shirt or cocktail) and dressy skirts; silk or satin shirts and blouses, crisp button-downs, fine knits and turtlenecks; tailored trousers or dark, clean jeans; blazers, suit jackets, a wool coat or trench; loafers, dress shoes, heels, sleek boots
- **Shape and fabric:** tailored or fluid lines, nothing baggy or worn in; richer fabrics (silk, satin, velvet, fine wool, cashmere); one statement piece, print or detail
- **Colors:** black, navy, cream and white, deep jewel tones (burgundy, emerald, plum); one bold color or print as the statement
- **Breaks the mood:** hoodies and sweatshirts, athletic wear, t-shirts and graphic tees, shorts, cargo and utility pieces, ripped or distressed denim, puffers, fleece and windbreakers, sneakers and trainers, flip flops
- Textbook (+0.35): `silk`, `satin`, `velvet`, `lace`, `sequin`, `cocktail`, `gown`, `tuxedo`, `suit`, `blazer`, `dress shirt`, `button-down`, `button-up`, `blouse`, `turtleneck`, `cashmere`, `tailored`, `trouser`, `slip dress`, `wrap dress`, `sheath`, `jumpsuit`, `midi`, `maxi`, `pleated`, `heel`, `pump`, `loafer`, `oxford`, `derby`, `brogue`, `dress shoe`, `chelsea`, `mary jane`
- Works (+0.15): `dress`, `skirt`, `shirt`, `knit`, `sweater`, `cardigan`, `vest`, `waistcoat`, `wool coat`, `trench`, `coat`, `chino`, `ankle boot`, `boot`, `mule`, `flat`, `ballet`, `sandal`, `sundress`, `jean`
- Clashes (−0.45): `hoodie`, `sweatshirt`, `jogger`, `legging`, `sweatpant`, `track`, `tracksuit`, `athletic`, `running`, `gym`, `graphic`, `tshirt`, `tee`, `shorts`, `cargo`, `utility`, `ripped`, `distressed`, `puffer`, `fleece`, `windbreaker`, `anorak`, `sneaker`, `trainer`, `flip-flop`, `slide`, `denim jacket`, `rain boot`, `wellington`, `welly`, `gumboot`
- Colors that help (+0.05): `Black`, `Navy`, `Cream`, `White`, `Red`, `Purple`, `Green` · hurt (−0.10): `Orange`, `Yellow`

Retired moods: Creative and Sporty (stored values ignored; athleisure reads as Casual). Romantic maps to Special day.

### Sample mood scores

Untagged pieces, from the app's scoring code. **Bold** = strong fit, ~~struck~~ = off-mood.

| Piece | Professional | Casual | Special day |
| --- | ---: | ---: | ---: |
| Blue Button Down Shirt | **0.85** | **0.70** | **0.85** |
| White Crew Neck T-Shirt | ~~0.10~~ | **0.90** | ~~0.10~~ |
| Cream Wool Knit Sweater | **0.70** | **0.70** | **0.70** |
| Pink Silk Blouse | **0.85** | 0.50 | **0.85** |
| Blue Slim Jeans | ~~0.05~~ | **0.90** | 0.65 |
| Beige Chinos | **0.70** | **0.90** | 0.65 |
| Black Pleated Skirt | **0.70** | 0.65 | **0.90** |
| Grey Joggers | ~~0.10~~ | **0.70** | ~~0.05~~ |
| Beige Linen Shorts | ~~0.10~~ | **0.70** | ~~0.05~~ |
| Blue Denim Jacket | ~~0.05~~ | **0.90** | ~~0.05~~ |
| Navy Blazer | **0.90** | 0.55 | **0.90** |
| Beige Cardigan | **0.70** | **0.90** | 0.65 |
| Black Leather Biker Jacket | 0.55 | 0.65 | 0.55 |
| Navy Waterproof Rain Jacket | 0.55 | **0.70** | 0.55 |
| Beige Trench Coat | **0.90** | 0.55 | 0.65 |
| Black Puffer Jacket | ~~0.10~~ | 0.65 | ~~0.10~~ |
| Olive Wrap Dress | 0.65 | **0.70** | **0.85** |
| White Sundress | ~~0.10~~ | **0.90** | **0.70** |
| White Sneakers | ~~0.10~~ | **0.90** | ~~0.10~~ |
| Brown Suede Loafers | **0.90** | 0.65 | **0.85** |
| Black Ankle Boots | **0.70** | 0.65 | **0.70** |
| Black Rain Boots | 0.55 | 0.65 | ~~0.10~~ |
| Brown Strappy Sandals | ~~0.10~~ | 0.65 | 0.65 |

## Weather rules

The reading becomes one temperature band, read from "feels like", plus rain, snow and wind (30 km/h or more). Each active rule scores every piece from 0.50. A match on any rule's "breaks it" list caps the piece at 0.20, so a warm band can't rescue it. Below 0.35 a piece is never sent to the AI.

Every outfit (the AI's and the backup picks) then gets, when the closet has one:

- Rain or wind: a weatherproof layer (rain jacket, trench, shell, anorak, parka, windbreaker).
- Cold, cool or rain: some outer layer.
- Rain: boots instead of other shoes.

Card score: `Weather = 40 × season share + 60 × weather fit`, with fit rescaled so 0.20 → 0 and 0.80+ → 1. Without a reading it is `50 + 50 × season share`.

### Cold (feels 5 °C or below)

Dress warm: a coat on every outfit, long sleeves and full-length bottoms, closed shoes or boots.

- Made for it (+0.30): `coat`, `wool coat`, `puffer`, `parka`, `down jacket`, `down coat`, `fleece`, `thermal`, `turtleneck`, `sweater`, `knit`, `cashmere`, `boot`
- Works (+0.15): `cardigan`, `jacket`, `trench`, `hoodie`, `sweatshirt`, `jean`, `trouser`, `legging`, `corduroy`, `flannel`
- Mildly wrong (−0.15): `tshirt dress`, `mini`, `ballet`, `mesh`, `sneaker`
- Breaks it, never sent (capped at 0.20): `shorts`, `bike short`, `sandal`, `flip flop`, `slide`, `espadrille`, `tank`, `cami`, `camisole`, `crop`, `linen`, `sundress`, `slip dress`

### Cool (feels 6 to 15 °C)

Layer up: a jacket or coat over long sleeves, closed shoes.

- Made for it (+0.30): `jacket`, `trench`, `coat`, `cardigan`, `sweater`, `knit`, `boot`
- Works (+0.15): `jean`, `trouser`, `chino`, `sweatshirt`, `hoodie`, `fleece`, `blazer`, `shirt`, `flannel`, `loafer`
- Mildly wrong (−0.15): `shorts`, `sandal`, `tank`, `cami`, `crop`, `linen`, `sundress`, `espadrille`
- Breaks it, never sent (capped at 0.20): `flip flop`, `slide`

### Mild (feels 16 to 24 °C)

Light layers: a tee, shirt or light knit, with a light jacket at most. No heavy coats.

- Made for it (+0.30): `tshirt`, `tee`, `shirt`, `blouse`, `denim jacket`, `trench`, `cardigan`
- Works (+0.15): `jean`, `chino`, `skirt`, `dress`, `sneaker`, `loafer`, `polo`, `light jacket`
- Mildly wrong (−0.15): `puffer`, `parka`, `down jacket`, `down coat`, `wool coat`, `fleece`, `thermal`, `snow boot`, `turtleneck`
- Breaks it, never sent (capped at 0.20): —

### Hot (feels 25 °C or above)

Keep it breathable: short sleeves, linen and cotton, shorts, skirts or light dresses, open or light shoes. No coats, knits or boots.

- Made for it (+0.30): `linen`, `shorts`, `sundress`, `tank`, `cami`, `sandal`, `espadrille`, `short sleeve`
- Works (+0.15): `tshirt`, `tee`, `skirt`, `slip dress`, `polo`, `sneaker`, `shirt`, `blouse`
- Mildly wrong (−0.15): `sweater`, `knit`, `cardigan`, `cashmere`, `boot`, `leather jacket`, `jean`, `legging`, `blazer`, `hoodie`, `sweatshirt`, `jacket`, `coat`, `trench`
- Breaks it, never sent (capped at 0.20): `puffer`, `parka`, `down jacket`, `down coat`, `wool coat`, `fleece`, `thermal`, `snow boot`, `turtleneck`

### Rain

Rain: a waterproof or wind-proof outer layer (raincoat, trench, shell) on every outfit and boots on your feet. Knits only under the raincoat. No leather, suede, canvas or open shoes.

- Made for it (+0.30): `raincoat`, `rain jacket`, `rain coat`, `mac`, `mackintosh`, `trench`, `waterproof`, `water resistant`, `shell`, `anorak`, `parka`, `windbreaker`, `gore tex`, `rain boot`, `wellington`, `welly`, `gumboot`, `rubber`
- Works (+0.15): `boot`, `nylon`, `puffer`, `polyester`
- Mildly wrong (−0.15): `denim jacket`, `sneaker`, `linen`, `chiffon`, `mule`, `loafer`, `heel`
- Only under a weatherproof layer (otherwise capped at 0.20): `knit`, `knitted`, `knitwear`, `sweater`, `cardigan`, `jumper`, `cashmere`, `mohair`
- Breaks it, never sent (capped at 0.20): `leather`, `suede`, `nubuck`, `canvas`, `espadrille`, `sandal`, `flip flop`, `slide`, `ballet`, `silk`, `satin`

### Snow or ice

Snow: warm boots with grip, a warm waterproof coat. No open, smooth-soled or delicate shoes.

- Made for it (+0.30): `boot`, `snow boot`, `parka`, `puffer`, `down jacket`, `down coat`, `wool coat`, `thermal`
- Works (+0.15): `coat`, `fleece`, `waterproof`
- Mildly wrong (−0.15): `sneaker`, `loafer`
- Breaks it, never sent (capped at 0.20): `sandal`, `flip flop`, `slide`, `espadrille`, `ballet`, `heel`, `pump`, `stiletto`, `mule`, `canvas`, `suede`

### Windy

Wind: a wind-proof outer layer that closes (windbreaker, shell, trench, parka). Skip floaty skirts and sheer fabrics.

- Made for it (+0.30): `windbreaker`, `shell`, `anorak`, `parka`, `trench`, `raincoat`, `rain jacket`
- Works (+0.15): `jacket`, `coat`, `puffer`
- Mildly wrong (−0.15): `chiffon`, `tulle`, `slip skirt`, `maxi skirt`, `sheer`
- Breaks it, never sent (capped at 0.20): —

### Sample weather scores

Weather fit only. **Bold** = made for it, ~~struck~~ = kept out of outfits that day.

| Piece | Rain 9 °C | Rain 9 °C, owns a raincoat | Cold 2 °C | Mild 20 °C | Hot 29 °C | Windy 14 °C |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Blue Button Down Shirt | 0.65 | 0.65 | 0.50 | **0.80** | 0.65 | 0.65 |
| White Crew Neck T-Shirt | 0.50 | 0.50 | 0.50 | **0.80** | 0.65 | 0.50 |
| Cream Wool Knit Sweater | ~~0.20~~ | **0.80** | **0.80** | 0.50 | 0.35 | **0.80** |
| Pink Silk Blouse | ~~0.20~~ | ~~0.20~~ | 0.50 | **0.80** | 0.65 | 0.50 |
| Blue Slim Jeans | 0.65 | 0.65 | 0.65 | 0.65 | 0.35 | 0.65 |
| Beige Chinos | 0.65 | 0.65 | 0.50 | 0.65 | 0.50 | 0.65 |
| Black Pleated Skirt | 0.50 | 0.50 | 0.50 | 0.65 | 0.65 | 0.50 |
| Grey Joggers | 0.50 | 0.50 | 0.50 | 0.50 | 0.50 | 0.50 |
| Beige Linen Shorts | ~~0.20~~ | ~~0.20~~ | ~~0.20~~ | 0.50 | **0.80** | 0.35 |
| Blue Denim Jacket | 0.65 | 0.65 | 0.65 | **0.80** | 0.35 | **0.95** |
| Navy Blazer | 0.65 | 0.65 | 0.50 | 0.50 | 0.35 | 0.65 |
| Beige Cardigan | ~~0.20~~ | **0.80** | 0.65 | **0.80** | 0.35 | **0.80** |
| Black Leather Biker Jacket | ~~0.20~~ | ~~0.20~~ | 0.65 | 0.50 | 0.35 | **0.95** |
| Navy Waterproof Rain Jacket | **1.00** | **1.00** | 0.65 | 0.50 | 0.35 | **1.00** |
| Beige Trench Coat | **1.00** | **1.00** | **0.80** | **0.80** | 0.35 | **1.00** |
| Black Puffer Jacket | **0.95** | **0.95** | **0.80** | 0.35 | ~~0.20~~ | **0.95** |
| Olive Wrap Dress | 0.50 | 0.50 | 0.50 | 0.65 | 0.50 | 0.50 |
| White Sundress | 0.35 | 0.35 | ~~0.20~~ | 0.50 | **0.80** | 0.35 |
| White Sneakers | 0.35 | 0.35 | 0.35 | 0.65 | 0.65 | 0.50 |
| Brown Suede Loafers | ~~0.20~~ | ~~0.20~~ | 0.50 | 0.65 | 0.50 | 0.65 |
| Black Ankle Boots | **0.95** | **0.95** | **0.80** | 0.50 | 0.35 | **0.80** |
| Black Rain Boots | **1.00** | **1.00** | **0.80** | 0.50 | 0.35 | **0.80** |
| Brown Strappy Sandals | ~~0.20~~ | ~~0.20~~ | ~~0.20~~ | 0.50 | **0.80** | 0.35 |
