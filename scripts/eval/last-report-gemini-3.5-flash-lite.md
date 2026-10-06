# Intake-model A/B eval

- Fixtures: `scripts/gen/out/flux2-iris`
- Nova model: `us.amazon.nova-2-lite-v1:0` (region `us-east-2`)
- Gemini model: `gemini-3.5-flash-lite`
- Run at: 2026-10-06T14:19:35.130Z


### Gemini gemini-3.5-flash-lite (227 fixtures)

| Metric | Value |
|---|---|
| Success rate (no error / no fallback) | 100.0% |
| Category accuracy | 83.3% |
| Subcategory keyword hit | 85.5% |
| Avg color score (0–1, higher = closer hex) | 0.749 |
| Avg color RGB distance (lower = closer) | 50.2 |
| Avg mood Jaccard | 0.648 |
| Avg season Jaccard | 0.675 |
| Avg latency (ms) | 1166 |

### Per-fixture

| Fixture | Nova cat | Gemini cat | Nova color | Gemini color | Nova sub-hit | Gemini sub-hit | Nova ms | Gemini ms |
|---|---|---|---|---|---|---|---|---|
| bottoms-chinos-beige-s40802 | ERR | ✓ | — | 59 | ✗ | ✗ | 0 | 1300 |
| bottoms-chinos-black-s63971 | ERR | ✓ | — | 31 | ✗ | ✗ | 0 | 1379 |
| bottoms-chinos-blue-s8750 | ERR | ✓ | — | 83 | ✗ | ✗ | 0 | 1155 |
| bottoms-chinos-brown-s1230 | ERR | ✓ | — | 50 | ✗ | ✓ | 0 | 1008 |
| bottoms-chinos-cream-s18286 | ERR | ✓ | — | 47 | ✗ | ✗ | 0 | 1039 |
| bottoms-chinos-grey-s48029 | ERR | ✓ | — | 41 | ✗ | ✓ | 0 | 1203 |
| bottoms-chinos-navy-s46052 | ERR | ✓ | — | 75 | ✗ | ✗ | 0 | 1120 |
| bottoms-chinos-olive-s42021 | ERR | ✓ | — | 56 | ✗ | ✗ | 0 | 1461 |
| bottoms-chinos-pink-s1464 | ERR | ✓ | — | 119 | ✗ | ✗ | 0 | 1063 |
| bottoms-chinos-white-s37735 | ERR | ✓ | — | 0 | ✗ | ✗ | 0 | 1071 |
| bottoms-denim-shorts-beige-s56027 | ERR | ✓ | — | 23 | ✗ | ✓ | 0 | 1448 |
| bottoms-denim-shorts-black-s79196 | ERR | ✓ | — | 45 | ✗ | ✓ | 0 | 1678 |
| bottoms-denim-shorts-blue-s69703 | ERR | ✓ | — | 90 | ✗ | ✓ | 0 | 1129 |
| bottoms-denim-shorts-brown-s16455 | ERR | ✓ | — | 50 | ✗ | ✓ | 0 | 1302 |
| bottoms-denim-shorts-cream-s33511 | ERR | ✓ | — | 42 | ✗ | ✓ | 0 | 1049 |
| bottoms-denim-shorts-grey-s8982 | ERR | ✓ | — | 75 | ✗ | ✓ | 0 | 1299 |
| bottoms-denim-shorts-navy-s7005 | ERR | ✓ | — | 27 | ✗ | ✓ | 0 | 1091 |
| bottoms-denim-shorts-olive-s57246 | ERR | ✓ | — | 48 | ✗ | ✓ | 0 | 1472 |
| bottoms-denim-shorts-pink-s62417 | ERR | ✓ | — | 85 | ✗ | ✓ | 0 | 1166 |
| bottoms-denim-shorts-white-s52960 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 938 |
| bottoms-pleated-skirt-beige-s27991 | ERR | ✓ | — | 38 | ✗ | ✓ | 0 | 1139 |
| bottoms-pleated-skirt-black-s51160 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1928 |
| bottoms-pleated-skirt-blue-s39427 | ERR | ✓ | — | 117 | ✗ | ✓ | 0 | 1293 |
| bottoms-pleated-skirt-brown-s88419 | ERR | ✓ | — | 34 | ✗ | ✓ | 0 | 1314 |
| bottoms-pleated-skirt-cream-s38179 | ERR | ✓ | — | 39 | ✗ | ✓ | 0 | 1148 |
| bottoms-pleated-skirt-grey-s78706 | ERR | ✓ | — | 41 | ✗ | ✓ | 0 | 1039 |
| bottoms-pleated-skirt-navy-s76729 | ERR | ✓ | — | 75 | ✗ | ✓ | 0 | 1440 |
| bottoms-pleated-skirt-olive-s29210 | ERR | ✓ | — | 54 | ✗ | ✓ | 0 | 1096 |
| bottoms-pleated-skirt-pink-s32141 | ERR | ✓ | — | 119 | ✗ | ✓ | 0 | 973 |
| bottoms-pleated-skirt-white-s24924 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1299 |
| bottoms-slim-jeans-beige-s15793 | ERR | ✓ | — | 44 | ✗ | ✗ | 0 | 1900 |
| bottoms-slim-jeans-black-s38962 | ERR | ✓ | — | 32 | ✗ | ✓ | 0 | 1092 |
| bottoms-slim-jeans-blue-s15101 | ERR | ✓ | — | 108 | ✗ | ✓ | 0 | 1438 |
| bottoms-slim-jeans-brown-s76221 | ERR | ✓ | — | 28 | ✗ | ✓ | 0 | 1155 |
| bottoms-slim-jeans-cream-s93277 | ERR | ✓ | — | 40 | ✗ | ✗ | 0 | 940 |
| bottoms-slim-jeans-grey-s54380 | ERR | ✓ | — | 65 | ✗ | ✓ | 0 | 1573 |
| bottoms-slim-jeans-navy-s52403 | ERR | ✓ | — | 79 | ✗ | ✓ | 0 | 1267 |
| bottoms-slim-jeans-olive-s17012 | ERR | ✓ | — | 43 | ✗ | ✗ | 0 | 1028 |
| bottoms-slim-jeans-pink-s7815 | ERR | ✓ | — | 89 | ✗ | ✗ | 0 | 922 |
| bottoms-slim-jeans-white-s12726 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1501 |
| bottoms-trousers-beige-s20677 | ERR | ✓ | — | 57 | ✗ | ✓ | 0 | 1062 |
| bottoms-trousers-black-s43846 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1561 |
| bottoms-trousers-blue-s70385 | ERR | ✓ | — | 93 | ✗ | ✓ | 0 | 1224 |
| bottoms-trousers-brown-s81105 | ERR | ✓ | — | 36 | ✗ | ✓ | 0 | 1408 |
| bottoms-trousers-cream-s98161 | ERR | ✓ | — | 40 | ✗ | ✓ | 0 | 1732 |
| bottoms-trousers-grey-s9664 | ERR | ✓ | — | 41 | ✗ | ✓ | 0 | 1160 |
| bottoms-trousers-navy-s7687 | ERR | ✓ | — | 89 | ✗ | ✓ | 0 | 1283 |
| bottoms-trousers-olive-s21896 | ERR | ✓ | — | 46 | ✗ | ✓ | 0 | 1051 |
| bottoms-trousers-pink-s63099 | ERR | ✓ | — | 73 | ✗ | ✓ | 0 | 1738 |
| bottoms-trousers-white-s17610 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1022 |
| dresses-slip-dress-beige-s36853 | ERR | ✗ | — | 44 | ✗ | ✗ | 0 | 1296 |
| dresses-slip-dress-black-s60022 | ERR | ✗ | — | 0 | ✗ | ✗ | 0 | 1044 |
| dresses-slip-dress-blue-s51169 | ERR | ✓ | — | 68 | ✗ | ✓ | 0 | 1188 |
| dresses-slip-dress-brown-s97281 | ERR | ✗ | — | 37 | ✗ | ✗ | 0 | 934 |
| dresses-slip-dress-cream-s14337 | ERR | ✗ | — | 47 | ✗ | ✗ | 0 | 1036 |
| dresses-slip-dress-grey-s90448 | ERR | ✗ | — | 65 | ✗ | ✗ | 0 | 1460 |
| dresses-slip-dress-navy-s88471 | ERR | ✗ | — | 93 | ✗ | ✗ | 0 | 1409 |
| dresses-slip-dress-olive-s38072 | ERR | ✗ | — | 48 | ✗ | ✗ | 0 | 984 |
| dresses-slip-dress-pink-s43883 | ERR | ✗ | — | 75 | ✗ | ✗ | 0 | 1217 |
| dresses-slip-dress-white-s33786 | ERR | ✗ | — | 0 | ✗ | ✗ | 0 | 1194 |
| dresses-sundress-beige-s43238 | ERR | ✗ | — | 62 | ✗ | ✗ | 0 | 1258 |
| dresses-sundress-black-s66407 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1126 |
| dresses-sundress-blue-s21650 | ERR | ✗ | — | 29 | ✗ | ✗ | 0 | 1157 |
| dresses-sundress-brown-s3666 | ERR | ✗ | — | 50 | ✗ | ✗ | 0 | 957 |
| dresses-sundress-cream-s20722 | ERR | ✓ | — | 48 | ✗ | ✓ | 0 | 911 |
| dresses-sundress-grey-s60929 | ERR | ✓ | — | 41 | ✗ | ✓ | 0 | 1038 |
| dresses-sundress-navy-s58952 | ERR | ✓ | — | 75 | ✗ | ✓ | 0 | 1459 |
| dresses-sundress-olive-s44457 | ERR | ✗ | — | 30 | ✗ | ✗ | 0 | 1159 |
| dresses-sundress-pink-s14364 | ERR | ✗ | — | 72 | ✗ | ✗ | 0 | 1247 |
| dresses-sundress-white-s40171 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1374 |
| dresses-wrap-dress-beige-s16183 | ERR | ✓ | — | 73 | ✗ | ✓ | 0 | 1069 |
| dresses-wrap-dress-black-s39352 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1270 |
| dresses-wrap-dress-blue-s15875 | ERR | ✓ | — | 79 | ✗ | ✓ | 0 | 1425 |
| dresses-wrap-dress-brown-s76611 | ERR | ✓ | — | 43 | ✗ | ✓ | 0 | 1642 |
| dresses-wrap-dress-cream-s93667 | ERR | ✓ | — | 49 | ✗ | ✓ | 0 | 1070 |
| dresses-wrap-dress-grey-s55154 | ERR | ✓ | — | 34 | ✗ | ✓ | 0 | 919 |
| dresses-wrap-dress-navy-s53177 | ERR | ✓ | — | 79 | ✗ | ✓ | 0 | 893 |
| dresses-wrap-dress-olive-s17402 | ERR | ✓ | — | 52 | ✗ | ✓ | 0 | 1185 |
| dresses-wrap-dress-pink-s8589 | ERR | ✓ | — | 94 | ✗ | ✓ | 0 | 898 |
| dresses-wrap-dress-white-s13116 | ERR | ✓ | — | 0 | ✗ | ✗ | 0 | 980 |
| outerwear-blazer-beige-s79252 | ERR | ✓ | — | 32 | ✗ | ✓ | 0 | 1105 |
| outerwear-blazer-black-s2421 | ERR | ✓ | — | 38 | ✗ | ✓ | 0 | 997 |
| outerwear-blazer-blue-s92896 | ERR | ✓ | — | 99 | ✗ | ✓ | 0 | 952 |
| outerwear-blazer-brown-s39680 | ERR | ✓ | — | 50 | ✗ | ✓ | 0 | 1081 |
| outerwear-blazer-cream-s56736 | ERR | ✓ | — | 49 | ✗ | ✓ | 0 | 1010 |
| outerwear-blazer-grey-s32175 | ERR | ✓ | — | 41 | ✗ | ✓ | 0 | 1365 |
| outerwear-blazer-navy-s62902 | ERR | ✓ | — | 59 | ✗ | ✓ | 0 | 1755 |
| outerwear-blazer-olive-s80471 | ERR | ✓ | — | 56 | ✗ | ✓ | 0 | 1073 |
| outerwear-blazer-pink-s18314 | ERR | ✓ | — | 74 | ✗ | ✓ | 0 | 1404 |
| outerwear-blazer-white-s76185 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 855 |
| outerwear-cardigan-beige-s67629 | ERR | ✓ | — | 41 | ✗ | ✓ | 0 | 1039 |
| outerwear-cardigan-black-s90798 | ERR | ✓ | — | 31 | ✗ | ✓ | 0 | 938 |
| outerwear-cardigan-blue-s4665 | ERR | ✗ | — | 63 | ✗ | ✓ | 0 | 928 |
| outerwear-cardigan-blue-v1-s4666 | ERR | ✓ | — | 61 | ✗ | ✓ | 0 | 984 |
| outerwear-cardigan-brown-s28057 | ERR | ✗ | — | 60 | ✗ | ✓ | 0 | 1106 |
| outerwear-cardigan-cream-s45113 | ERR | ✓ | — | 55 | ✗ | ✓ | 0 | 1076 |
| outerwear-cardigan-grey-s43944 | ERR | ✓ | — | 65 | ✗ | ✓ | 0 | 920 |
| outerwear-cardigan-grey-v1-s43945 | ERR | ✓ | — | 41 | ✗ | ✓ | 0 | 1401 |
| outerwear-cardigan-navy-s74671 | ERR | ✓ | — | 73 | ✗ | ✓ | 0 | 1475 |
| outerwear-cardigan-navy-v1-s74672 | ERR | ✓ | — | 65 | ✗ | ✓ | 0 | 1263 |
| outerwear-cardigan-olive-s68848 | ERR | ✓ | — | 56 | ✗ | ✓ | 0 | 1767 |
| outerwear-cardigan-pink-s30083 | ERR | ✓ | — | 119 | ✗ | ✓ | 0 | 904 |
| outerwear-cardigan-pink-v1-s30084 | ERR | ✓ | — | 94 | ✗ | ✓ | 0 | 1171 |
| outerwear-cardigan-white-s64562 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1044 |
| outerwear-denim-jacket-beige-s70048 | ERR | ✓ | — | 43 | ✗ | ✓ | 0 | 1016 |
| outerwear-denim-jacket-black-s93217 | ERR | ✓ | — | 59 | ✗ | ✓ | 0 | 922 |
| outerwear-denim-jacket-blue-s31020 | ERR | ✓ | — | 112 | ✗ | ✓ | 0 | 1025 |
| outerwear-denim-jacket-brown-s30476 | ERR | ✓ | — | 53 | ✗ | ✓ | 0 | 844 |
| outerwear-denim-jacket-cream-s80236 | ERR | ✓ | — | 55 | ✗ | ✓ | 0 | 834 |
| outerwear-denim-jacket-grey-s3003 | ERR | ✓ | — | 65 | ✗ | ✓ | 0 | 1079 |
| outerwear-denim-jacket-navy-s1026 | ERR | ✓ | — | 20 | ✗ | ✓ | 0 | 1439 |
| outerwear-denim-jacket-olive-s71267 | ERR | ✓ | — | 48 | ✗ | ✓ | 0 | 1167 |
| outerwear-denim-jacket-pink-s56438 | ERR | ✓ | — | 119 | ✗ | ✓ | 0 | 1171 |
| outerwear-denim-jacket-white-s99685 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1025 |
| outerwear-puffer-parka-beige-s38552 | ERR | ✓ | — | 40 | ✗ | ✓ | 0 | 1405 |
| outerwear-puffer-parka-beige-v1-s38553 | ERR | ✓ | — | 37 | ✗ | ✓ | 0 | 1025 |
| outerwear-puffer-parka-black-s61721 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1113 |
| outerwear-puffer-parka-black-v1-s61722 | ERR | ✓ | — | 42 | ✗ | ✓ | 0 | 1556 |
| outerwear-puffer-parka-blue-s14628 | ERR | ✓ | — | 92 | ✗ | ✓ | 0 | 970 |
| outerwear-puffer-parka-brown-s98980 | ERR | ✓ | — | 50 | ✗ | ✓ | 0 | 879 |
| outerwear-puffer-parka-brown-v1-s98981 | ERR | ✓ | — | 50 | ✗ | ✓ | 0 | 887 |
| outerwear-puffer-parka-cream-s16036 | ERR | ✓ | — | 39 | ✗ | ✓ | 0 | 925 |
| outerwear-puffer-parka-cream-v1-s16037 | ERR | ✓ | — | 42 | ✗ | ✓ | 0 | 1115 |
| outerwear-puffer-parka-grey-s53907 | ERR | ✓ | — | 35 | ✗ | ✓ | 0 | 1297 |
| outerwear-puffer-parka-navy-s51930 | ERR | ✓ | — | 63 | ✗ | ✓ | 0 | 1078 |
| outerwear-puffer-parka-olive-s39771 | ERR | ✓ | — | 56 | ✗ | ✓ | 0 | 944 |
| outerwear-puffer-parka-olive-v1-s39772 | ERR | ✓ | — | 43 | ✗ | ✓ | 0 | 1068 |
| outerwear-puffer-parka-pink-s7342 | ERR | ✓ | — | 119 | ✗ | ✓ | 0 | 1020 |
| outerwear-puffer-parka-white-s35485 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1272 |
| outerwear-puffer-parka-white-v1-s35486 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1058 |
| outerwear-wool-coat-beige-s40425 | ERR | ✓ | — | 28 | ✗ | ✓ | 0 | 1331 |
| outerwear-wool-coat-black-s63594 | ERR | ✓ | — | 35 | ✗ | ✓ | 0 | 1709 |
| outerwear-wool-coat-blue-s57109 | ERR | ✓ | — | 155 | ✗ | ✓ | 0 | 1567 |
| outerwear-wool-coat-brown-s100853 | ERR | ✓ | — | 50 | ✗ | ✓ | 0 | 1145 |
| outerwear-wool-coat-cream-s50613 | ERR | ✓ | — | 48 | ✗ | ✗ | 0 | 1062 |
| outerwear-wool-coat-grey-s96388 | ERR | ✓ | — | 65 | ✗ | ✓ | 0 | 1212 |
| outerwear-wool-coat-navy-s94411 | ERR | ✓ | — | 89 | ✗ | ✓ | 0 | 1158 |
| outerwear-wool-coat-olive-s41644 | ERR | ✓ | — | 50 | ✗ | ✓ | 0 | 1098 |
| outerwear-wool-coat-pink-s49823 | ERR | ✓ | — | 71 | ✗ | ✓ | 0 | 1323 |
| outerwear-wool-coat-white-s70062 | ERR | ✓ | — | 0 | ✗ | ✗ | 0 | 966 |
| shoes-ankle-boots-beige-s86711 | ERR | ✗ | — | 40 | ✗ | ✓ | 0 | 1047 |
| shoes-ankle-boots-black-s9880 | ERR | ✗ | — | 0 | ✗ | ✓ | 0 | 921 |
| shoes-ankle-boots-blue-s93827 | ERR | ✗ | — | 80 | ✗ | ✓ | 0 | 1054 |
| shoes-ankle-boots-brown-s47139 | ERR | ✗ | — | 50 | ✗ | ✓ | 0 | 993 |
| shoes-ankle-boots-cream-s96899 | ERR | ✓ | — | 36 | ✗ | ✓ | 0 | 1249 |
| shoes-ankle-boots-grey-s33106 | ERR | ✗ | — | 48 | ✗ | ✓ | 0 | 1027 |
| shoes-ankle-boots-navy-s31129 | ERR | ✗ | — | 57 | ✗ | ✓ | 0 | 1224 |
| shoes-ankle-boots-olive-s87930 | ERR | ✗ | — | 82 | ✗ | ✓ | 0 | 1424 |
| shoes-ankle-boots-pink-s86541 | ERR | ✗ | — | 88 | ✗ | ✓ | 0 | 866 |
| shoes-ankle-boots-white-s16348 | ERR | ✗ | — | 0 | ✗ | ✓ | 0 | 1097 |
| shoes-loafers-beige-s94404 | ERR | ✗ | — | 46 | ✗ | ✓ | 0 | 1177 |
| shoes-loafers-black-s17573 | ERR | ✗ | — | 17 | ✗ | ✓ | 0 | 2071 |
| shoes-loafers-blue-s36656 | ERR | ✗ | — | 81 | ✗ | ✓ | 0 | 1480 |
| shoes-loafers-brown-s54832 | ERR | ✗ | — | 50 | ✗ | ✓ | 0 | 1701 |
| shoes-loafers-cream-s71888 | ERR | ✓ | — | 41 | ✗ | ✓ | 0 | 1427 |
| shoes-loafers-grey-s75935 | ERR | ✓ | — | 65 | ✗ | ✓ | 0 | 1022 |
| shoes-loafers-navy-s73958 | ERR | ✗ | — | 77 | ✗ | ✓ | 0 | 1182 |
| shoes-loafers-olive-s95623 | ERR | ✗ | — | 56 | ✗ | ✓ | 0 | 1383 |
| shoes-loafers-pink-s29370 | ERR | ✗ | — | 94 | ✗ | ✓ | 0 | 885 |
| shoes-loafers-white-s91337 | ERR | ✗ | — | 0 | ✗ | ✓ | 0 | 933 |
| shoes-sneakers-beige-s14996 | ERR | ✗ | — | 46 | ✗ | ✓ | 0 | 1195 |
| shoes-sneakers-brown-s75424 | ERR | ✗ | — | 50 | ✗ | ✓ | 0 | 994 |
| shoes-sneakers-cream-s92480 | ERR | ✓ | — | 41 | ✗ | ✓ | 0 | 900 |
| shoes-sneakers-grey-s81743 | ERR | ✗ | — | 65 | ✗ | ✓ | 0 | 1199 |
| shoes-sneakers-navy-s12470 | ERR | ✗ | — | 79 | ✗ | ✓ | 0 | 1072 |
| shoes-sneakers-pink-s67882 | ERR | ✓ | — | 94 | ✗ | ✓ | 0 | 895 |
| shoes-sneakers-white-s11929 | ERR | ✗ | — | 0 | ✗ | ✓ | 0 | 939 |
| tops-button-down-beige-s22525 | ERR | ✓ | — | 41 | ✗ | ✓ | 0 | 923 |
| tops-button-down-black-s45694 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 853 |
| tops-button-down-blue-s41129 | ERR | ✓ | — | 53 | ✗ | ✓ | 0 | 993 |
| tops-button-down-brown-s82953 | ERR | ✓ | — | 50 | ✗ | ✓ | 0 | 1142 |
| tops-button-down-cream-s100009 | ERR | ✓ | — | 49 | ✗ | ✓ | 0 | 1444 |
| tops-button-down-grey-s80408 | ERR | ✓ | — | 65 | ✗ | ✓ | 0 | 1134 |
| tops-button-down-navy-s78431 | ERR | ✓ | — | 74 | ✗ | ✓ | 0 | 1503 |
| tops-button-down-olive-s91040 | ERR | ✓ | — | 41 | ✗ | ✓ | 0 | 1004 |
| tops-button-down-pink-s33843 | ERR | ✓ | — | 119 | ✗ | ✓ | 0 | 892 |
| tops-button-down-white-s19458 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1099 |
| tops-crew-tee-beige-s18776 | ERR | ✓ | — | 48 | ✗ | ✓ | 0 | 1686 |
| tops-crew-tee-black-s74649 | ERR | ✓ | — | 31 | ✗ | ✓ | 0 | 1064 |
| tops-crew-tee-blue-s74692 | ERR | ✓ | — | 97 | ✗ | ✓ | 0 | 901 |
| tops-crew-tee-brown-s11908 | ERR | ✓ | — | 50 | ✗ | ✓ | 0 | 941 |
| tops-crew-tee-cream-s28964 | ERR | ✓ | — | 37 | ✗ | ✓ | 0 | 1136 |
| tops-crew-tee-grey-s13971 | ERR | ✓ | — | 20 | ✗ | ✓ | 0 | 1228 |
| tops-crew-tee-navy-s11994 | ERR | ✓ | — | 69 | ✗ | ✓ | 0 | 1013 |
| tops-crew-tee-olive-s19995 | ERR | ✓ | — | 32 | ✗ | ✓ | 0 | 1050 |
| tops-crew-tee-pink-s67406 | ERR | ✓ | — | 94 | ✗ | ✓ | 0 | 1134 |
| tops-crew-tee-white-s48413 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1082 |
| tops-hoodie-beige-s84244 | ERR | ✓ | — | 54 | ✗ | ✓ | 0 | 1251 |
| tops-hoodie-black-s7413 | ERR | ✓ | — | 31 | ✗ | ✓ | 0 | 1853 |
| tops-hoodie-blue-s63392 | ERR | ✓ | — | 84 | ✗ | ✓ | 0 | 1538 |
| tops-hoodie-brown-s44672 | ERR | ✓ | — | 59 | ✗ | ✓ | 0 | 1003 |
| tops-hoodie-cream-s61728 | ERR | ✓ | — | 37 | ✗ | ✓ | 0 | 838 |
| tops-hoodie-grey-s2671 | ERR | ✓ | — | 42 | ✗ | ✓ | 0 | 1269 |
| tops-hoodie-navy-s100694 | ERR | ✓ | — | 75 | ✗ | ✓ | 0 | 1233 |
| tops-hoodie-olive-s85463 | ERR | ✓ | — | 48 | ✗ | ✓ | 0 | 1462 |
| tops-hoodie-pink-s56106 | ERR | ✓ | — | 89 | ✗ | ✓ | 0 | 1263 |
| tops-hoodie-white-s81177 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1153 |
| tops-knit-sweater-beige-s81754 | ERR | ✓ | — | 55 | ✗ | ✓ | 0 | 1167 |
| tops-knit-sweater-black-s4923 | ERR | ✓ | — | 19 | ✗ | ✓ | 0 | 938 |
| tops-knit-sweater-blue-s45478 | ERR | ✓ | — | 82 | ✗ | ✓ | 0 | 830 |
| tops-knit-sweater-brown-s42182 | ERR | ✓ | — | 43 | ✗ | ✓ | 0 | 1153 |
| tops-knit-sweater-cream-s59238 | ERR | ✓ | — | 48 | ✗ | ✓ | 0 | 829 |
| tops-knit-sweater-grey-s84757 | ERR | ✓ | — | 41 | ✗ | ✓ | 0 | 1025 |
| tops-knit-sweater-navy-s82780 | ERR | ✓ | — | 72 | ✗ | ✓ | 0 | 1900 |
| tops-knit-sweater-olive-s82973 | ERR | ✓ | — | 39 | ✗ | ✓ | 0 | 943 |
| tops-knit-sweater-pink-s70896 | ERR | ✓ | — | 94 | ✗ | ✓ | 0 | 942 |
| tops-knit-sweater-white-s78687 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1090 |
| tops-shirt-dress-beige-s50375 | ERR | ✓ | — | 37 | ✗ | ✓ | 0 | 1137 |
| tops-shirt-dress-black-s73544 | ERR | ✓ | — | 45 | ✗ | ✓ | 0 | 1551 |
| tops-shirt-dress-blue-s25011 | ERR | ✓ | — | 82 | ✗ | ✓ | 0 | 973 |
| tops-shirt-dress-brown-s10803 | ERR | ✓ | — | 47 | ✗ | ✓ | 0 | 1198 |
| tops-shirt-dress-cream-s27859 | ERR | ✓ | — | 39 | ✗ | ✓ | 0 | 1053 |
| tops-shirt-dress-grey-s64290 | ERR | ✓ | — | 29 | ✗ | ✓ | 0 | 1026 |
| tops-shirt-dress-navy-s62313 | ERR | ✓ | — | 71 | ✗ | ✓ | 0 | 971 |
| tops-shirt-dress-olive-s18890 | ERR | ✓ | — | 34 | ✗ | ✓ | 0 | 932 |
| tops-shirt-dress-pink-s17725 | ERR | ✓ | — | 94 | ✗ | ✓ | 0 | 1145 |
| tops-shirt-dress-white-s47308 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1235 |
| tops-silk-blouse-beige-s14310 | ERR | ✓ | — | 51 | ✗ | ✓ | 0 | 860 |
| tops-silk-blouse-black-s37479 | ERR | ✓ | — | 0 | ✗ | ✗ | 0 | 889 |
| tops-silk-blouse-blue-s7890 | ERR | ✓ | — | 75 | ✗ | ✗ | 0 | 1082 |
| tops-silk-blouse-brown-s74738 | ERR | ✓ | — | 45 | ✗ | ✓ | 0 | 964 |
| tops-silk-blouse-cream-s91794 | ERR | ✓ | — | 41 | ✗ | ✓ | 0 | 1340 |
| tops-silk-blouse-grey-s47169 | ERR | ✓ | — | 65 | ✗ | ✓ | 0 | 864 |
| tops-silk-blouse-navy-s45192 | ERR | ✓ | — | 66 | ✗ | ✓ | 0 | 1066 |
| tops-silk-blouse-olive-s15529 | ERR | ✓ | — | 15 | ✗ | ✓ | 0 | 1001 |
| tops-silk-blouse-pink-s100604 | ERR | ✓ | — | 47 | ✗ | ✗ | 0 | 988 |
| tops-silk-blouse-white-s11243 | ERR | ✓ | — | 0 | ✗ | ✗ | 0 | 1005 |


## How to read this

- **Category accuracy** — most important; if a model can't tell tops from bottoms, nothing else matters.
- **Color score** — `1.0` is identical hex; `0.5` ≈ 100 RGB units off (noticeable but related shade); `0.0` ≈ unrelated color.
- **Subcategory hit** — binary keyword match. Looser than category, looks for any of the ground-truth keywords in the model's free-text subcategory.
- **Latency** — wall-clock including network. Different regions/keys will skew this.
