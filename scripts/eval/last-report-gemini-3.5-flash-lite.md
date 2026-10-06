# Intake-model A/B eval

- Fixtures: `scripts/gen/out/flux2-iris`
- Nova model: `us.amazon.nova-2-lite-v1:0` (region `us-east-2`)
- Gemini model: `gemini-3.5-flash-lite`
- Run at: 2026-10-06T13:57:38.203Z


### Gemini gemini-3.5-flash-lite (227 fixtures)

| Metric | Value |
|---|---|
| Success rate (no error / no fallback) | 100.0% |
| Category accuracy | 82.8% |
| Subcategory keyword hit | 86.8% |
| Avg color score (0–1, higher = closer hex) | 0.744 |
| Avg color RGB distance (lower = closer) | 51.1 |
| Avg mood Jaccard | 0.662 |
| Avg season Jaccard | 0.675 |
| Avg latency (ms) | 1804 |

### Per-fixture

| Fixture | Nova cat | Gemini cat | Nova color | Gemini color | Nova sub-hit | Gemini sub-hit | Nova ms | Gemini ms |
|---|---|---|---|---|---|---|---|---|
| bottoms-chinos-beige-s40802 | ERR | ✓ | — | 49 | ✗ | ✗ | 0 | 2484 |
| bottoms-chinos-black-s63971 | ERR | ✓ | — | 0 | ✗ | ✗ | 0 | 1990 |
| bottoms-chinos-blue-s8750 | ERR | ✓ | — | 75 | ✗ | ✗ | 0 | 2021 |
| bottoms-chinos-brown-s1230 | ERR | ✓ | — | 50 | ✗ | ✓ | 0 | 1953 |
| bottoms-chinos-cream-s18286 | ERR | ✓ | — | 42 | ✗ | ✗ | 0 | 1312 |
| bottoms-chinos-grey-s48029 | ERR | ✓ | — | 42 | ✗ | ✓ | 0 | 1791 |
| bottoms-chinos-navy-s46052 | ERR | ✓ | — | 72 | ✗ | ✗ | 0 | 1548 |
| bottoms-chinos-olive-s42021 | ERR | ✓ | — | 56 | ✗ | ✗ | 0 | 2336 |
| bottoms-chinos-pink-s1464 | ERR | ✓ | — | 119 | ✗ | ✗ | 0 | 1330 |
| bottoms-chinos-white-s37735 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1849 |
| bottoms-denim-shorts-beige-s56027 | ERR | ✓ | — | 28 | ✗ | ✓ | 0 | 1489 |
| bottoms-denim-shorts-black-s79196 | ERR | ✓ | — | 55 | ✗ | ✓ | 0 | 1460 |
| bottoms-denim-shorts-blue-s69703 | ERR | ✓ | — | 69 | ✗ | ✓ | 0 | 1758 |
| bottoms-denim-shorts-brown-s16455 | ERR | ✓ | — | 58 | ✗ | ✓ | 0 | 1832 |
| bottoms-denim-shorts-cream-s33511 | ERR | ✓ | — | 46 | ✗ | ✓ | 0 | 1341 |
| bottoms-denim-shorts-grey-s8982 | ERR | ✓ | — | 65 | ✗ | ✓ | 0 | 1559 |
| bottoms-denim-shorts-navy-s7005 | ERR | ✓ | — | 26 | ✗ | ✓ | 0 | 1941 |
| bottoms-denim-shorts-olive-s57246 | ERR | ✓ | — | 56 | ✗ | ✓ | 0 | 1333 |
| bottoms-denim-shorts-pink-s62417 | ERR | ✓ | — | 119 | ✗ | ✓ | 0 | 1282 |
| bottoms-denim-shorts-white-s52960 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1791 |
| bottoms-pleated-skirt-beige-s27991 | ERR | ✓ | — | 43 | ✗ | ✓ | 0 | 2285 |
| bottoms-pleated-skirt-black-s51160 | ERR | ✓ | — | 45 | ✗ | ✓ | 0 | 1154 |
| bottoms-pleated-skirt-blue-s39427 | ERR | ✓ | — | 95 | ✗ | ✓ | 0 | 1473 |
| bottoms-pleated-skirt-brown-s88419 | ERR | ✓ | — | 47 | ✗ | ✓ | 0 | 2222 |
| bottoms-pleated-skirt-cream-s38179 | ERR | ✓ | — | 42 | ✗ | ✓ | 0 | 1965 |
| bottoms-pleated-skirt-grey-s78706 | ERR | ✓ | — | 34 | ✗ | ✓ | 0 | 1332 |
| bottoms-pleated-skirt-navy-s76729 | ERR | ✓ | — | 73 | ✗ | ✓ | 0 | 1627 |
| bottoms-pleated-skirt-olive-s29210 | ERR | ✓ | — | 56 | ✗ | ✓ | 0 | 1361 |
| bottoms-pleated-skirt-pink-s32141 | ERR | ✓ | — | 119 | ✗ | ✓ | 0 | 1312 |
| bottoms-pleated-skirt-white-s24924 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1554 |
| bottoms-slim-jeans-beige-s15793 | ERR | ✓ | — | 35 | ✗ | ✗ | 0 | 1721 |
| bottoms-slim-jeans-black-s38962 | ERR | ✓ | — | 45 | ✗ | ✓ | 0 | 1682 |
| bottoms-slim-jeans-blue-s15101 | ERR | ✓ | — | 110 | ✗ | ✓ | 0 | 1487 |
| bottoms-slim-jeans-brown-s76221 | ERR | ✓ | — | 28 | ✗ | ✓ | 0 | 2077 |
| bottoms-slim-jeans-cream-s93277 | ERR | ✓ | — | 41 | ✗ | ✗ | 0 | 1340 |
| bottoms-slim-jeans-grey-s54380 | ERR | ✓ | — | 44 | ✗ | ✓ | 0 | 1930 |
| bottoms-slim-jeans-navy-s52403 | ERR | ✓ | — | 84 | ✗ | ✓ | 0 | 1712 |
| bottoms-slim-jeans-olive-s17012 | ERR | ✓ | — | 46 | ✗ | ✓ | 0 | 1352 |
| bottoms-slim-jeans-pink-s7815 | ERR | ✓ | — | 99 | ✗ | ✓ | 0 | 1921 |
| bottoms-slim-jeans-white-s12726 | ERR | ✓ | — | 0 | ✗ | ✗ | 0 | 1905 |
| bottoms-trousers-beige-s20677 | ERR | ✓ | — | 43 | ✗ | ✓ | 0 | 1446 |
| bottoms-trousers-black-s43846 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1395 |
| bottoms-trousers-blue-s70385 | ERR | ✓ | — | 81 | ✗ | ✓ | 0 | 1400 |
| bottoms-trousers-brown-s81105 | ERR | ✓ | — | 37 | ✗ | ✓ | 0 | 1478 |
| bottoms-trousers-cream-s98161 | ERR | ✓ | — | 41 | ✗ | ✓ | 0 | 1848 |
| bottoms-trousers-grey-s9664 | ERR | ✓ | — | 65 | ✗ | ✓ | 0 | 1667 |
| bottoms-trousers-navy-s7687 | ERR | ✓ | — | 82 | ✗ | ✓ | 0 | 1751 |
| bottoms-trousers-olive-s21896 | ERR | ✓ | — | 64 | ✗ | ✓ | 0 | 1756 |
| bottoms-trousers-pink-s63099 | ERR | ✓ | — | 75 | ✗ | ✓ | 0 | 1489 |
| bottoms-trousers-white-s17610 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 2192 |
| dresses-slip-dress-beige-s36853 | ERR | ✗ | — | 46 | ✗ | ✗ | 0 | 1199 |
| dresses-slip-dress-black-s60022 | ERR | ✗ | — | 45 | ✗ | ✗ | 0 | 1815 |
| dresses-slip-dress-blue-s51169 | ERR | ✓ | — | 77 | ✗ | ✓ | 0 | 1323 |
| dresses-slip-dress-brown-s97281 | ERR | ✗ | — | 39 | ✗ | ✗ | 0 | 1602 |
| dresses-slip-dress-cream-s14337 | ERR | ✗ | — | 55 | ✗ | ✗ | 0 | 1544 |
| dresses-slip-dress-grey-s90448 | ERR | ✗ | — | 48 | ✗ | ✗ | 0 | 1374 |
| dresses-slip-dress-navy-s88471 | ERR | ✗ | — | 77 | ✗ | ✗ | 0 | 1958 |
| dresses-slip-dress-olive-s38072 | ERR | ✗ | — | 40 | ✗ | ✗ | 0 | 1604 |
| dresses-slip-dress-pink-s43883 | ERR | ✗ | — | 94 | ✗ | ✗ | 0 | 1538 |
| dresses-slip-dress-white-s33786 | ERR | ✗ | — | 0 | ✗ | ✗ | 0 | 1810 |
| dresses-sundress-beige-s43238 | ERR | ✗ | — | 70 | ✗ | ✗ | 0 | 1853 |
| dresses-sundress-black-s66407 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1294 |
| dresses-sundress-blue-s21650 | ERR | ✗ | — | 29 | ✗ | ✗ | 0 | 1658 |
| dresses-sundress-brown-s3666 | ERR | ✗ | — | 50 | ✗ | ✗ | 0 | 1448 |
| dresses-sundress-cream-s20722 | ERR | ✓ | — | 48 | ✗ | ✓ | 0 | 2066 |
| dresses-sundress-grey-s60929 | ERR | ✓ | — | 65 | ✗ | ✓ | 0 | 2101 |
| dresses-sundress-navy-s58952 | ERR | ✓ | — | 71 | ✗ | ✓ | 0 | 1410 |
| dresses-sundress-olive-s44457 | ERR | ✗ | — | 40 | ✗ | ✗ | 0 | 1997 |
| dresses-sundress-pink-s14364 | ERR | ✗ | — | 94 | ✗ | ✗ | 0 | 2356 |
| dresses-sundress-white-s40171 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1425 |
| dresses-wrap-dress-beige-s16183 | ERR | ✓ | — | 64 | ✗ | ✓ | 0 | 1605 |
| dresses-wrap-dress-black-s39352 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1606 |
| dresses-wrap-dress-blue-s15875 | ERR | ✓ | — | 71 | ✗ | ✓ | 0 | 1655 |
| dresses-wrap-dress-brown-s76611 | ERR | ✓ | — | 43 | ✗ | ✓ | 0 | 1892 |
| dresses-wrap-dress-cream-s93667 | ERR | ✓ | — | 55 | ✗ | ✓ | 0 | 2609 |
| dresses-wrap-dress-grey-s55154 | ERR | ✓ | — | 35 | ✗ | ✓ | 0 | 1534 |
| dresses-wrap-dress-navy-s53177 | ERR | ✓ | — | 82 | ✗ | ✓ | 0 | 2248 |
| dresses-wrap-dress-olive-s17402 | ERR | ✓ | — | 56 | ✗ | ✓ | 0 | 1357 |
| dresses-wrap-dress-pink-s8589 | ERR | ✓ | — | 94 | ✗ | ✓ | 0 | 1393 |
| dresses-wrap-dress-white-s13116 | ERR | ✓ | — | 0 | ✗ | ✗ | 0 | 1775 |
| outerwear-blazer-beige-s79252 | ERR | ✓ | — | 44 | ✗ | ✓ | 0 | 2357 |
| outerwear-blazer-black-s2421 | ERR | ✓ | — | 42 | ✗ | ✓ | 0 | 2308 |
| outerwear-blazer-blue-s92896 | ERR | ✓ | — | 103 | ✗ | ✓ | 0 | 1602 |
| outerwear-blazer-brown-s39680 | ERR | ✓ | — | 50 | ✗ | ✓ | 0 | 2219 |
| outerwear-blazer-cream-s56736 | ERR | ✓ | — | 49 | ✗ | ✓ | 0 | 2321 |
| outerwear-blazer-grey-s32175 | ERR | ✓ | — | 65 | ✗ | ✓ | 0 | 2963 |
| outerwear-blazer-navy-s62902 | ERR | ✓ | — | 49 | ✗ | ✓ | 0 | 1895 |
| outerwear-blazer-olive-s80471 | ERR | ✓ | — | 42 | ✗ | ✓ | 0 | 1835 |
| outerwear-blazer-pink-s18314 | ERR | ✓ | — | 62 | ✗ | ✓ | 0 | 2559 |
| outerwear-blazer-white-s76185 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1173 |
| outerwear-cardigan-beige-s67629 | ERR | ✗ | — | 48 | ✗ | ✓ | 0 | 2578 |
| outerwear-cardigan-black-s90798 | ERR | ✗ | — | 31 | ✗ | ✓ | 0 | 2153 |
| outerwear-cardigan-blue-s4665 | ERR | ✓ | — | 56 | ✗ | ✓ | 0 | 1665 |
| outerwear-cardigan-blue-v1-s4666 | ERR | ✓ | — | 64 | ✗ | ✓ | 0 | 2191 |
| outerwear-cardigan-brown-s28057 | ERR | ✓ | — | 53 | ✗ | ✓ | 0 | 2139 |
| outerwear-cardigan-cream-s45113 | ERR | ✓ | — | 49 | ✗ | ✓ | 0 | 1526 |
| outerwear-cardigan-grey-s43944 | ERR | ✗ | — | 65 | ✗ | ✓ | 0 | 1392 |
| outerwear-cardigan-grey-v1-s43945 | ERR | ✓ | — | 41 | ✗ | ✓ | 0 | 1425 |
| outerwear-cardigan-navy-s74671 | ERR | ✓ | — | 60 | ✗ | ✓ | 0 | 1498 |
| outerwear-cardigan-navy-v1-s74672 | ERR | ✓ | — | 76 | ✗ | ✓ | 0 | 1508 |
| outerwear-cardigan-olive-s68848 | ERR | ✓ | — | 56 | ✗ | ✓ | 0 | 1655 |
| outerwear-cardigan-pink-s30083 | ERR | ✓ | — | 119 | ✗ | ✓ | 0 | 1561 |
| outerwear-cardigan-pink-v1-s30084 | ERR | ✓ | — | 94 | ✗ | ✓ | 0 | 1332 |
| outerwear-cardigan-white-s64562 | ERR | ✗ | — | 0 | ✗ | ✓ | 0 | 1325 |
| outerwear-denim-jacket-beige-s70048 | ERR | ✓ | — | 43 | ✗ | ✓ | 0 | 1499 |
| outerwear-denim-jacket-black-s93217 | ERR | ✓ | — | 48 | ✗ | ✓ | 0 | 2304 |
| outerwear-denim-jacket-blue-s31020 | ERR | ✓ | — | 111 | ✗ | ✓ | 0 | 2333 |
| outerwear-denim-jacket-brown-s30476 | ERR | ✓ | — | 50 | ✗ | ✓ | 0 | 1411 |
| outerwear-denim-jacket-cream-s80236 | ERR | ✓ | — | 44 | ✗ | ✓ | 0 | 1505 |
| outerwear-denim-jacket-grey-s3003 | ERR | ✓ | — | 65 | ✗ | ✓ | 0 | 1867 |
| outerwear-denim-jacket-navy-s1026 | ERR | ✓ | — | 26 | ✗ | ✓ | 0 | 1589 |
| outerwear-denim-jacket-olive-s71267 | ERR | ✓ | — | 44 | ✗ | ✓ | 0 | 2854 |
| outerwear-denim-jacket-pink-s56438 | ERR | ✓ | — | 119 | ✗ | ✓ | 0 | 1138 |
| outerwear-denim-jacket-white-s99685 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1236 |
| outerwear-puffer-parka-beige-s38552 | ERR | ✓ | — | 55 | ✗ | ✓ | 0 | 2061 |
| outerwear-puffer-parka-beige-v1-s38553 | ERR | ✓ | — | 53 | ✗ | ✓ | 0 | 1407 |
| outerwear-puffer-parka-black-s61721 | ERR | ✓ | — | 47 | ✗ | ✓ | 0 | 1417 |
| outerwear-puffer-parka-black-v1-s61722 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1853 |
| outerwear-puffer-parka-blue-s14628 | ERR | ✓ | — | 97 | ✗ | ✓ | 0 | 1942 |
| outerwear-puffer-parka-brown-s98980 | ERR | ✓ | — | 57 | ✗ | ✓ | 0 | 1867 |
| outerwear-puffer-parka-brown-v1-s98981 | ERR | ✓ | — | 50 | ✗ | ✓ | 0 | 1730 |
| outerwear-puffer-parka-cream-s16036 | ERR | ✓ | — | 37 | ✗ | ✓ | 0 | 1273 |
| outerwear-puffer-parka-cream-v1-s16037 | ERR | ✓ | — | 41 | ✗ | ✓ | 0 | 2190 |
| outerwear-puffer-parka-grey-s53907 | ERR | ✓ | — | 33 | ✗ | ✓ | 0 | 1348 |
| outerwear-puffer-parka-navy-s51930 | ERR | ✓ | — | 58 | ✗ | ✓ | 0 | 1709 |
| outerwear-puffer-parka-olive-s39771 | ERR | ✓ | — | 43 | ✗ | ✓ | 0 | 2093 |
| outerwear-puffer-parka-olive-v1-s39772 | ERR | ✓ | — | 35 | ✗ | ✓ | 0 | 1630 |
| outerwear-puffer-parka-pink-s7342 | ERR | ✓ | — | 131 | ✗ | ✓ | 0 | 1716 |
| outerwear-puffer-parka-white-s35485 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 2423 |
| outerwear-puffer-parka-white-v1-s35486 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1759 |
| outerwear-wool-coat-beige-s40425 | ERR | ✓ | — | 32 | ✗ | ✓ | 0 | 2439 |
| outerwear-wool-coat-black-s63594 | ERR | ✓ | — | 35 | ✗ | ✓ | 0 | 1568 |
| outerwear-wool-coat-blue-s57109 | ERR | ✓ | — | 154 | ✗ | ✓ | 0 | 1462 |
| outerwear-wool-coat-brown-s100853 | ERR | ✓ | — | 50 | ✗ | ✓ | 0 | 1286 |
| outerwear-wool-coat-cream-s50613 | ERR | ✓ | — | 42 | ✗ | ✗ | 0 | 1622 |
| outerwear-wool-coat-grey-s96388 | ERR | ✓ | — | 65 | ✗ | ✓ | 0 | 1809 |
| outerwear-wool-coat-navy-s94411 | ERR | ✓ | — | 85 | ✗ | ✓ | 0 | 1686 |
| outerwear-wool-coat-olive-s41644 | ERR | ✓ | — | 40 | ✗ | ✓ | 0 | 2228 |
| outerwear-wool-coat-pink-s49823 | ERR | ✓ | — | 80 | ✗ | ✓ | 0 | 2068 |
| outerwear-wool-coat-white-s70062 | ERR | ✓ | — | 0 | ✗ | ✗ | 0 | 2625 |
| shoes-ankle-boots-beige-s86711 | ERR | ✗ | — | 40 | ✗ | ✓ | 0 | 2139 |
| shoes-ankle-boots-black-s9880 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 2009 |
| shoes-ankle-boots-blue-s93827 | ERR | ✗ | — | 80 | ✗ | ✓ | 0 | 1700 |
| shoes-ankle-boots-brown-s47139 | ERR | ✗ | — | 50 | ✗ | ✓ | 0 | 2765 |
| shoes-ankle-boots-cream-s96899 | ERR | ✓ | — | 39 | ✗ | ✓ | 0 | 2017 |
| shoes-ankle-boots-grey-s33106 | ERR | ✓ | — | 65 | ✗ | ✓ | 0 | 1636 |
| shoes-ankle-boots-navy-s31129 | ERR | ✗ | — | 44 | ✗ | ✓ | 0 | 1599 |
| shoes-ankle-boots-olive-s87930 | ERR | ✗ | — | 47 | ✗ | ✓ | 0 | 1523 |
| shoes-ankle-boots-pink-s86541 | ERR | ✗ | — | 88 | ✗ | ✓ | 0 | 1278 |
| shoes-ankle-boots-white-s16348 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1573 |
| shoes-loafers-beige-s94404 | ERR | ✗ | — | 46 | ✗ | ✓ | 0 | 1444 |
| shoes-loafers-black-s17573 | ERR | ✗ | — | 0 | ✗ | ✓ | 0 | 1366 |
| shoes-loafers-blue-s36656 | ERR | ✗ | — | 77 | ✗ | ✓ | 0 | 2601 |
| shoes-loafers-brown-s54832 | ERR | ✗ | — | 50 | ✗ | ✓ | 0 | 1310 |
| shoes-loafers-cream-s71888 | ERR | ✗ | — | 39 | ✗ | ✓ | 0 | 1662 |
| shoes-loafers-grey-s75935 | ERR | ✗ | — | 65 | ✗ | ✓ | 0 | 1415 |
| shoes-loafers-navy-s73958 | ERR | ✗ | — | 56 | ✗ | ✓ | 0 | 1625 |
| shoes-loafers-olive-s95623 | ERR | ✗ | — | 61 | ✗ | ✓ | 0 | 1810 |
| shoes-loafers-pink-s29370 | ERR | ✗ | — | 97 | ✗ | ✓ | 0 | 1442 |
| shoes-loafers-white-s91337 | ERR | ✗ | — | 0 | ✗ | ✓ | 0 | 1362 |
| shoes-sneakers-beige-s14996 | ERR | ✗ | — | 48 | ✗ | ✓ | 0 | 1457 |
| shoes-sneakers-brown-s75424 | ERR | ✗ | — | 50 | ✗ | ✓ | 0 | 6846 |
| shoes-sneakers-cream-s92480 | ERR | ✓ | — | 41 | ✗ | ✓ | 0 | 2079 |
| shoes-sneakers-grey-s81743 | ERR | ✗ | — | 65 | ✗ | ✓ | 0 | 1608 |
| shoes-sneakers-navy-s12470 | ERR | ✗ | — | 84 | ✗ | ✓ | 0 | 2575 |
| shoes-sneakers-pink-s67882 | ERR | ✓ | — | 94 | ✗ | ✓ | 0 | 2326 |
| shoes-sneakers-white-s11929 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1392 |
| tops-button-down-beige-s22525 | ERR | ✓ | — | 49 | ✗ | ✓ | 0 | 1638 |
| tops-button-down-black-s45694 | ERR | ✓ | — | 31 | ✗ | ✓ | 0 | 1477 |
| tops-button-down-blue-s41129 | ERR | ✓ | — | 43 | ✗ | ✓ | 0 | 1611 |
| tops-button-down-brown-s82953 | ERR | ✓ | — | 50 | ✗ | ✓ | 0 | 1712 |
| tops-button-down-cream-s100009 | ERR | ✓ | — | 49 | ✗ | ✓ | 0 | 1488 |
| tops-button-down-grey-s80408 | ERR | ✓ | — | 65 | ✗ | ✓ | 0 | 1534 |
| tops-button-down-navy-s78431 | ERR | ✓ | — | 74 | ✗ | ✓ | 0 | 2354 |
| tops-button-down-olive-s91040 | ERR | ✓ | — | 38 | ✗ | ✓ | 0 | 2492 |
| tops-button-down-pink-s33843 | ERR | ✓ | — | 131 | ✗ | ✓ | 0 | 1330 |
| tops-button-down-white-s19458 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1415 |
| tops-crew-tee-beige-s18776 | ERR | ✓ | — | 46 | ✗ | ✓ | 0 | 2379 |
| tops-crew-tee-black-s74649 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1703 |
| tops-crew-tee-blue-s74692 | ERR | ✓ | — | 75 | ✗ | ✓ | 0 | 1722 |
| tops-crew-tee-brown-s11908 | ERR | ✓ | — | 56 | ✗ | ✓ | 0 | 2227 |
| tops-crew-tee-cream-s28964 | ERR | ✓ | — | 39 | ✗ | ✓ | 0 | 1692 |
| tops-crew-tee-grey-s13971 | ERR | ✓ | — | 45 | ✗ | ✓ | 0 | 1477 |
| tops-crew-tee-navy-s11994 | ERR | ✓ | — | 71 | ✗ | ✓ | 0 | 1736 |
| tops-crew-tee-olive-s19995 | ERR | ✓ | — | 25 | ✗ | ✓ | 0 | 1741 |
| tops-crew-tee-pink-s67406 | ERR | ✓ | — | 119 | ✗ | ✓ | 0 | 1394 |
| tops-crew-tee-white-s48413 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 2425 |
| tops-hoodie-beige-s84244 | ERR | ✓ | — | 41 | ✗ | ✓ | 0 | 1662 |
| tops-hoodie-black-s7413 | ERR | ✓ | — | 39 | ✗ | ✓ | 0 | 1410 |
| tops-hoodie-blue-s63392 | ERR | ✗ | — | 85 | ✗ | ✓ | 0 | 2075 |
| tops-hoodie-brown-s44672 | ERR | ✓ | — | 61 | ✗ | ✓ | 0 | 2220 |
| tops-hoodie-cream-s61728 | ERR | ✓ | — | 40 | ✗ | ✓ | 0 | 1391 |
| tops-hoodie-grey-s2671 | ERR | ✓ | — | 18 | ✗ | ✓ | 0 | 2169 |
| tops-hoodie-navy-s100694 | ERR | ✓ | — | 77 | ✗ | ✓ | 0 | 1267 |
| tops-hoodie-olive-s85463 | ERR | ✓ | — | 49 | ✗ | ✓ | 0 | 2217 |
| tops-hoodie-pink-s56106 | ERR | ✓ | — | 99 | ✗ | ✓ | 0 | 1343 |
| tops-hoodie-white-s81177 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1703 |
| tops-knit-sweater-beige-s81754 | ERR | ✓ | — | 57 | ✗ | ✓ | 0 | 2132 |
| tops-knit-sweater-black-s4923 | ERR | ✓ | — | 31 | ✗ | ✓ | 0 | 1554 |
| tops-knit-sweater-blue-s45478 | ERR | ✓ | — | 92 | ✗ | ✓ | 0 | 2347 |
| tops-knit-sweater-brown-s42182 | ERR | ✓ | — | 42 | ✗ | ✓ | 0 | 1809 |
| tops-knit-sweater-cream-s59238 | ERR | ✓ | — | 55 | ✗ | ✓ | 0 | 2180 |
| tops-knit-sweater-grey-s84757 | ERR | ✓ | — | 65 | ✗ | ✓ | 0 | 1726 |
| tops-knit-sweater-navy-s82780 | ERR | ✓ | — | 66 | ✗ | ✓ | 0 | 1715 |
| tops-knit-sweater-olive-s82973 | ERR | ✓ | — | 28 | ✗ | ✓ | 0 | 1564 |
| tops-knit-sweater-pink-s70896 | ERR | ✓ | — | 94 | ✗ | ✓ | 0 | 1471 |
| tops-knit-sweater-white-s78687 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 2416 |
| tops-shirt-dress-beige-s50375 | ERR | ✓ | — | 43 | ✗ | ✓ | 0 | 3222 |
| tops-shirt-dress-black-s73544 | ERR | ✓ | — | 45 | ✗ | ✓ | 0 | 2513 |
| tops-shirt-dress-blue-s25011 | ERR | ✓ | — | 68 | ✗ | ✓ | 0 | 1783 |
| tops-shirt-dress-brown-s10803 | ERR | ✓ | — | 53 | ✗ | ✓ | 0 | 1567 |
| tops-shirt-dress-cream-s27859 | ERR | ✓ | — | 39 | ✗ | ✓ | 0 | 1762 |
| tops-shirt-dress-grey-s64290 | ERR | ✓ | — | 65 | ✗ | ✓ | 0 | 1969 |
| tops-shirt-dress-navy-s62313 | ERR | ✓ | — | 62 | ✗ | ✓ | 0 | 1508 |
| tops-shirt-dress-olive-s18890 | ERR | ✓ | — | 39 | ✗ | ✓ | 0 | 1874 |
| tops-shirt-dress-pink-s17725 | ERR | ✓ | — | 94 | ✗ | ✓ | 0 | 1834 |
| tops-shirt-dress-white-s47308 | ERR | ✓ | — | 0 | ✗ | ✓ | 0 | 1911 |
| tops-silk-blouse-beige-s14310 | ERR | ✓ | — | 43 | ✗ | ✓ | 0 | 1717 |
| tops-silk-blouse-black-s37479 | ERR | ✓ | — | 31 | ✗ | ✓ | 0 | 2097 |
| tops-silk-blouse-blue-s7890 | ERR | ✓ | — | 74 | ✗ | ✗ | 0 | 1639 |
| tops-silk-blouse-brown-s74738 | ERR | ✓ | — | 48 | ✗ | ✓ | 0 | 1758 |
| tops-silk-blouse-cream-s91794 | ERR | ✓ | — | 49 | ✗ | ✓ | 0 | 1385 |
| tops-silk-blouse-grey-s47169 | ERR | ✓ | — | 65 | ✗ | ✓ | 0 | 2364 |
| tops-silk-blouse-navy-s45192 | ERR | ✓ | — | 73 | ✗ | ✓ | 0 | 1609 |
| tops-silk-blouse-olive-s15529 | ERR | ✓ | — | 25 | ✗ | ✓ | 0 | 1389 |
| tops-silk-blouse-pink-s100604 | ERR | ✓ | — | 47 | ✗ | ✗ | 0 | 3910 |
| tops-silk-blouse-white-s11243 | ERR | ✓ | — | 0 | ✗ | ✗ | 0 | 1708 |


## How to read this

- **Category accuracy** — most important; if a model can't tell tops from bottoms, nothing else matters.
- **Color score** — `1.0` is identical hex; `0.5` ≈ 100 RGB units off (noticeable but related shade); `0.0` ≈ unrelated color.
- **Subcategory hit** — binary keyword match. Looser than category, looks for any of the ground-truth keywords in the model's free-text subcategory.
- **Latency** — wall-clock including network. Different regions/keys will skew this.
