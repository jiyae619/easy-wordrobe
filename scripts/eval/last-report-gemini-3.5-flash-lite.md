# Intake-model A/B eval

- Fixtures: `scripts/gen/out/flux2-iris`
- Nova model: `us.amazon.nova-2-lite-v1:0` (region `us-east-2`)
- Gemini model: `gemini-3.5-flash-lite`
- Run at: 2026-10-07T00:53:48.015Z
- Git commit: `887c6f8` · prompt sha256: `45d68ae49fe9`
- Prompt allows shoes: yes · dress rule: yes

### AWS Nova 2 Lite (227 fixtures)

| Metric | Value |
|---|---|
| Success rate (no error / no fallback) | 0.0% |
| Category accuracy | 0.0% |
| Subcategory keyword hit | 0.0% |
| Avg color score (0–1, higher = closer hex) | 0.000 |
| Avg color RGB distance (lower = closer) | 0.0 |
| Avg mood Jaccard | 0.000 |
| Avg season Jaccard | 0.000 |
| Avg latency (ms) | 587 |

### Gemini gemini-3.5-flash-lite (227 fixtures)

| Metric | Value |
|---|---|
| Success rate (no error / no fallback) | 100.0% |
| Category accuracy | 93.4% |
| Subcategory keyword hit | 88.5% |
| Avg color score (0–1, higher = closer hex) | 0.749 |
| Avg color RGB distance (lower = closer) | 50.2 |
| Avg mood Jaccard | 0.654 |
| Avg season Jaccard | 0.689 |
| Avg latency (ms) | 1617 |


### Per-fixture

| Fixture | Nova cat | Gemini cat | Nova color | Gemini color | Nova sub-hit | Gemini sub-hit | Nova ms | Gemini ms |
|---|---|---|---|---|---|---|---|---|
| bottoms-chinos-beige-s40802 | ERR | ✓ | — | 58 | ✗ | ✗ | 867 | 1661 |
| bottoms-chinos-black-s63971 | ERR | ✓ | — | 31 | ✗ | ✗ | 553 | 1752 |
| bottoms-chinos-blue-s8750 | ERR | ✓ | — | 76 | ✗ | ✗ | 612 | 1596 |
| bottoms-chinos-brown-s1230 | ERR | ✓ | — | 50 | ✗ | ✓ | 544 | 1764 |
| bottoms-chinos-cream-s18286 | ERR | ✓ | — | 47 | ✗ | ✗ | 566 | 2004 |
| bottoms-chinos-grey-s48029 | ERR | ✓ | — | 41 | ✗ | ✓ | 495 | 1391 |
| bottoms-chinos-navy-s46052 | ERR | ✓ | — | 75 | ✗ | ✗ | 538 | 1997 |
| bottoms-chinos-olive-s42021 | ERR | ✓ | — | 56 | ✗ | ✗ | 563 | 1387 |
| bottoms-chinos-pink-s1464 | ERR | ✓ | — | 119 | ✗ | ✗ | 507 | 1709 |
| bottoms-chinos-white-s37735 | ERR | ✓ | — | 0 | ✗ | ✗ | 554 | 1551 |
| bottoms-denim-shorts-beige-s56027 | ERR | ✓ | — | 21 | ✗ | ✓ | 615 | 1526 |
| bottoms-denim-shorts-black-s79196 | ERR | ✓ | — | 45 | ✗ | ✓ | 615 | 1514 |
| bottoms-denim-shorts-blue-s69703 | ERR | ✓ | — | 81 | ✗ | ✓ | 616 | 1754 |
| bottoms-denim-shorts-brown-s16455 | ERR | ✓ | — | 43 | ✗ | ✓ | 505 | 1482 |
| bottoms-denim-shorts-cream-s33511 | ERR | ✓ | — | 41 | ✗ | ✓ | 559 | 1661 |
| bottoms-denim-shorts-grey-s8982 | ERR | ✓ | — | 65 | ✗ | ✓ | 558 | 1498 |
| bottoms-denim-shorts-navy-s7005 | ERR | ✓ | — | 20 | ✗ | ✓ | 927 | 1511 |
| bottoms-denim-shorts-olive-s57246 | ERR | ✓ | — | 56 | ✗ | ✓ | 503 | 1607 |
| bottoms-denim-shorts-pink-s62417 | ERR | ✓ | — | 94 | ✗ | ✓ | 543 | 1687 |
| bottoms-denim-shorts-white-s52960 | ERR | ✓ | — | 0 | ✗ | ✓ | 631 | 1492 |
| bottoms-pleated-skirt-beige-s27991 | ERR | ✓ | — | 45 | ✗ | ✓ | 451 | 1715 |
| bottoms-pleated-skirt-black-s51160 | ERR | ✓ | — | 0 | ✗ | ✓ | 504 | 1735 |
| bottoms-pleated-skirt-blue-s39427 | ERR | ✓ | — | 93 | ✗ | ✓ | 516 | 1572 |
| bottoms-pleated-skirt-brown-s88419 | ERR | ✓ | — | 43 | ✗ | ✓ | 671 | 1504 |
| bottoms-pleated-skirt-cream-s38179 | ERR | ✓ | — | 39 | ✗ | ✓ | 556 | 1567 |
| bottoms-pleated-skirt-grey-s78706 | ERR | ✓ | — | 65 | ✗ | ✓ | 565 | 1568 |
| bottoms-pleated-skirt-navy-s76729 | ERR | ✓ | — | 77 | ✗ | ✓ | 549 | 1408 |
| bottoms-pleated-skirt-olive-s29210 | ERR | ✓ | — | 49 | ✗ | ✓ | 552 | 1788 |
| bottoms-pleated-skirt-pink-s32141 | ERR | ✓ | — | 119 | ✗ | ✓ | 501 | 2232 |
| bottoms-pleated-skirt-white-s24924 | ERR | ✓ | — | 0 | ✗ | ✓ | 565 | 1349 |
| bottoms-slim-jeans-beige-s15793 | ERR | ✓ | — | 44 | ✗ | ✓ | 562 | 1499 |
| bottoms-slim-jeans-black-s38962 | ERR | ✓ | — | 52 | ✗ | ✓ | 499 | 1721 |
| bottoms-slim-jeans-blue-s15101 | ERR | ✓ | — | 126 | ✗ | ✓ | 566 | 1879 |
| bottoms-slim-jeans-brown-s76221 | ERR | ✓ | — | 46 | ✗ | ✓ | 550 | 1990 |
| bottoms-slim-jeans-cream-s93277 | ERR | ✓ | — | 47 | ✗ | ✓ | 625 | 1645 |
| bottoms-slim-jeans-grey-s54380 | ERR | ✓ | — | 65 | ✗ | ✓ | 561 | 1791 |
| bottoms-slim-jeans-navy-s52403 | ERR | ✓ | — | 89 | ✗ | ✓ | 655 | 1539 |
| bottoms-slim-jeans-olive-s17012 | ERR | ✓ | — | 56 | ✗ | ✗ | 702 | 1392 |
| bottoms-slim-jeans-pink-s7815 | ERR | ✓ | — | 99 | ✗ | ✓ | 619 | 1616 |
| bottoms-slim-jeans-white-s12726 | ERR | ✓ | — | 0 | ✗ | ✓ | 513 | 1592 |
| bottoms-trousers-beige-s20677 | ERR | ✓ | — | 43 | ✗ | ✓ | 547 | 1666 |
| bottoms-trousers-black-s43846 | ERR | ✓ | — | 17 | ✗ | ✓ | 556 | 1665 |
| bottoms-trousers-blue-s70385 | ERR | ✓ | — | 93 | ✗ | ✓ | 556 | 1850 |
| bottoms-trousers-brown-s81105 | ERR | ✓ | — | 37 | ✗ | ✓ | 768 | 1531 |
| bottoms-trousers-cream-s98161 | ERR | ✓ | — | 42 | ✗ | ✓ | 447 | 1524 |
| bottoms-trousers-grey-s9664 | ERR | ✓ | — | 65 | ✗ | ✓ | 519 | 1758 |
| bottoms-trousers-navy-s7687 | ERR | ✓ | — | 82 | ✗ | ✓ | 673 | 1593 |
| bottoms-trousers-olive-s21896 | ERR | ✓ | — | 69 | ✗ | ✓ | 614 | 1438 |
| bottoms-trousers-pink-s63099 | ERR | ✓ | — | 71 | ✗ | ✓ | 609 | 1988 |
| bottoms-trousers-white-s17610 | ERR | ✓ | — | 0 | ✗ | ✓ | 518 | 1417 |
| dresses-slip-dress-beige-s36853 | ERR | ✗ | — | 44 | ✗ | ✗ | 560 | 1606 |
| dresses-slip-dress-black-s60022 | ERR | ✗ | — | 19 | ✗ | ✗ | 707 | 1624 |
| dresses-slip-dress-blue-s51169 | ERR | ✓ | — | 80 | ✗ | ✓ | 491 | 1492 |
| dresses-slip-dress-brown-s97281 | ERR | ✗ | — | 39 | ✗ | ✗ | 550 | 1517 |
| dresses-slip-dress-cream-s14337 | ERR | ✗ | — | 49 | ✗ | ✗ | 551 | 1684 |
| dresses-slip-dress-grey-s90448 | ERR | ✓ | — | 65 | ✗ | ✓ | 531 | 1537 |
| dresses-slip-dress-navy-s88471 | ERR | ✗ | — | 71 | ✗ | ✗ | 620 | 1589 |
| dresses-slip-dress-olive-s38072 | ERR | ✗ | — | 56 | ✗ | ✗ | 492 | 1255 |
| dresses-slip-dress-pink-s43883 | ERR | ✓ | — | 99 | ✗ | ✓ | 657 | 1399 |
| dresses-slip-dress-white-s33786 | ERR | ✗ | — | 0 | ✗ | ✗ | 559 | 1489 |
| dresses-sundress-beige-s43238 | ERR | ✓ | — | 64 | ✗ | ✓ | 568 | 1611 |
| dresses-sundress-black-s66407 | ERR | ✓ | — | 0 | ✗ | ✓ | 504 | 1526 |
| dresses-sundress-blue-s21650 | ERR | ✓ | — | 67 | ✗ | ✓ | 732 | 1732 |
| dresses-sundress-brown-s3666 | ERR | ✓ | — | 67 | ✗ | ✓ | 570 | 1884 |
| dresses-sundress-cream-s20722 | ERR | ✓ | — | 48 | ✗ | ✓ | 587 | 1679 |
| dresses-sundress-grey-s60929 | ERR | ✓ | — | 41 | ✗ | ✓ | 568 | 1644 |
| dresses-sundress-navy-s58952 | ERR | ✓ | — | 71 | ✗ | ✓ | 499 | 1482 |
| dresses-sundress-olive-s44457 | ERR | ✗ | — | 46 | ✗ | ✗ | 639 | 1552 |
| dresses-sundress-pink-s14364 | ERR | ✗ | — | 54 | ✗ | ✗ | 779 | 2184 |
| dresses-sundress-white-s40171 | ERR | ✓ | — | 0 | ✗ | ✓ | 660 | 2017 |
| dresses-wrap-dress-beige-s16183 | ERR | ✓ | — | 55 | ✗ | ✓ | 573 | 1555 |
| dresses-wrap-dress-black-s39352 | ERR | ✓ | — | 0 | ✗ | ✓ | 735 | 1464 |
| dresses-wrap-dress-blue-s15875 | ERR | ✓ | — | 73 | ✗ | ✓ | 561 | 1623 |
| dresses-wrap-dress-brown-s76611 | ERR | ✓ | — | 40 | ✗ | ✓ | 713 | 1323 |
| dresses-wrap-dress-cream-s93667 | ERR | ✓ | — | 43 | ✗ | ✓ | 613 | 1492 |
| dresses-wrap-dress-grey-s55154 | ERR | ✓ | — | 41 | ✗ | ✓ | 518 | 1569 |
| dresses-wrap-dress-navy-s53177 | ERR | ✓ | — | 82 | ✗ | ✓ | 503 | 1903 |
| dresses-wrap-dress-olive-s17402 | ERR | ✓ | — | 42 | ✗ | ✓ | 618 | 2696 |
| dresses-wrap-dress-pink-s8589 | ERR | ✓ | — | 100 | ✗ | ✓ | 552 | 1668 |
| dresses-wrap-dress-white-s13116 | ERR | ✓ | — | 0 | ✗ | ✓ | 564 | 3064 |
| outerwear-blazer-beige-s79252 | ERR | ✓ | — | 43 | ✗ | ✓ | 561 | 1714 |
| outerwear-blazer-black-s2421 | ERR | ✓ | — | 0 | ✗ | ✓ | 570 | 1544 |
| outerwear-blazer-blue-s92896 | ERR | ✓ | — | 99 | ✗ | ✓ | 503 | 1718 |
| outerwear-blazer-brown-s39680 | ERR | ✓ | — | 50 | ✗ | ✓ | 614 | 1528 |
| outerwear-blazer-cream-s56736 | ERR | ✓ | — | 49 | ✗ | ✓ | 610 | 1465 |
| outerwear-blazer-grey-s32175 | ERR | ✓ | — | 33 | ✗ | ✓ | 565 | 1465 |
| outerwear-blazer-navy-s62902 | ERR | ✓ | — | 62 | ✗ | ✓ | 579 | 1445 |
| outerwear-blazer-olive-s80471 | ERR | ✓ | — | 49 | ✗ | ✓ | 720 | 1503 |
| outerwear-blazer-pink-s18314 | ERR | ✓ | — | 69 | ✗ | ✓ | 617 | 1449 |
| outerwear-blazer-white-s76185 | ERR | ✓ | — | 0 | ✗ | ✓ | 569 | 1939 |
| outerwear-cardigan-beige-s67629 | ERR | ✗ | — | 43 | ✗ | ✓ | 514 | 1685 |
| outerwear-cardigan-black-s90798 | ERR | ✗ | — | 0 | ✗ | ✓ | 572 | 1280 |
| outerwear-cardigan-blue-s4665 | ERR | ✓ | — | 53 | ✗ | ✓ | 565 | 1669 |
| outerwear-cardigan-blue-v1-s4666 | ERR | ✓ | — | 53 | ✗ | ✓ | 576 | 2060 |
| outerwear-cardigan-brown-s28057 | ERR | ✓ | — | 53 | ✗ | ✓ | 575 | 1753 |
| outerwear-cardigan-cream-s45113 | ERR | ✓ | — | 47 | ✗ | ✓ | 682 | 1848 |
| outerwear-cardigan-grey-s43944 | ERR | ✓ | — | 70 | ✗ | ✓ | 512 | 1596 |
| outerwear-cardigan-grey-v1-s43945 | ERR | ✓ | — | 34 | ✗ | ✓ | 553 | 1566 |
| outerwear-cardigan-navy-s74671 | ERR | ✓ | — | 64 | ✗ | ✓ | 665 | 1432 |
| outerwear-cardigan-navy-v1-s74672 | ERR | ✓ | — | 69 | ✗ | ✓ | 496 | 2117 |
| outerwear-cardigan-olive-s68848 | ERR | ✗ | — | 56 | ✗ | ✓ | 566 | 1460 |
| outerwear-cardigan-pink-s30083 | ERR | ✗ | — | 98 | ✗ | ✓ | 503 | 1679 |
| outerwear-cardigan-pink-v1-s30084 | ERR | ✗ | — | 94 | ✗ | ✓ | 1109 | 1466 |
| outerwear-cardigan-white-s64562 | ERR | ✗ | — | 0 | ✗ | ✓ | 510 | 1432 |
| outerwear-denim-jacket-beige-s70048 | ERR | ✓ | — | 41 | ✗ | ✓ | 570 | 1554 |
| outerwear-denim-jacket-black-s93217 | ERR | ✓ | — | 45 | ✗ | ✓ | 495 | 1749 |
| outerwear-denim-jacket-blue-s31020 | ERR | ✓ | — | 81 | ✗ | ✓ | 516 | 1409 |
| outerwear-denim-jacket-brown-s30476 | ERR | ✓ | — | 50 | ✗ | ✓ | 519 | 1429 |
| outerwear-denim-jacket-cream-s80236 | ERR | ✓ | — | 39 | ✗ | ✓ | 668 | 1923 |
| outerwear-denim-jacket-grey-s3003 | ERR | ✓ | — | 65 | ✗ | ✓ | 503 | 1247 |
| outerwear-denim-jacket-navy-s1026 | ERR | ✓ | — | 26 | ✗ | ✓ | 551 | 1333 |
| outerwear-denim-jacket-olive-s71267 | ERR | ✓ | — | 51 | ✗ | ✓ | 559 | 1805 |
| outerwear-denim-jacket-pink-s56438 | ERR | ✓ | — | 119 | ✗ | ✓ | 574 | 1649 |
| outerwear-denim-jacket-white-s99685 | ERR | ✓ | — | 0 | ✗ | ✓ | 565 | 1423 |
| outerwear-puffer-parka-beige-s38552 | ERR | ✓ | — | 43 | ✗ | ✓ | 564 | 1465 |
| outerwear-puffer-parka-beige-v1-s38553 | ERR | ✓ | — | 63 | ✗ | ✓ | 520 | 1573 |
| outerwear-puffer-parka-black-s61721 | ERR | ✓ | — | 21 | ✗ | ✓ | 597 | 1586 |
| outerwear-puffer-parka-black-v1-s61722 | ERR | ✓ | — | 0 | ✗ | ✓ | 661 | 1884 |
| outerwear-puffer-parka-blue-s14628 | ERR | ✓ | — | 111 | ✗ | ✓ | 586 | 1361 |
| outerwear-puffer-parka-brown-s98980 | ERR | ✓ | — | 50 | ✗ | ✓ | 556 | 1575 |
| outerwear-puffer-parka-brown-v1-s98981 | ERR | ✓ | — | 50 | ✗ | ✓ | 662 | 1610 |
| outerwear-puffer-parka-cream-s16036 | ERR | ✓ | — | 40 | ✗ | ✓ | 556 | 1470 |
| outerwear-puffer-parka-cream-v1-s16037 | ERR | ✓ | — | 49 | ✗ | ✓ | 556 | 1596 |
| outerwear-puffer-parka-grey-s53907 | ERR | ✓ | — | 33 | ✗ | ✓ | 597 | 1508 |
| outerwear-puffer-parka-navy-s51930 | ERR | ✓ | — | 55 | ✗ | ✓ | 565 | 1648 |
| outerwear-puffer-parka-olive-s39771 | ERR | ✓ | — | 43 | ✗ | ✓ | 608 | 2189 |
| outerwear-puffer-parka-olive-v1-s39772 | ERR | ✓ | — | 56 | ✗ | ✓ | 570 | 1329 |
| outerwear-puffer-parka-pink-s7342 | ERR | ✓ | — | 119 | ✗ | ✓ | 608 | 1528 |
| outerwear-puffer-parka-white-s35485 | ERR | ✓ | — | 0 | ✗ | ✓ | 573 | 1557 |
| outerwear-puffer-parka-white-v1-s35486 | ERR | ✓ | — | 0 | ✗ | ✓ | 638 | 1754 |
| outerwear-wool-coat-beige-s40425 | ERR | ✓ | — | 42 | ✗ | ✓ | 552 | 1782 |
| outerwear-wool-coat-black-s63594 | ERR | ✓ | — | 35 | ✗ | ✓ | 556 | 1934 |
| outerwear-wool-coat-blue-s57109 | ERR | ✓ | — | 154 | ✗ | ✓ | 608 | 1667 |
| outerwear-wool-coat-brown-s100853 | ERR | ✓ | — | 50 | ✗ | ✓ | 601 | 1741 |
| outerwear-wool-coat-cream-s50613 | ERR | ✓ | — | 42 | ✗ | ✗ | 794 | 2243 |
| outerwear-wool-coat-grey-s96388 | ERR | ✓ | — | 65 | ✗ | ✓ | 625 | 1448 |
| outerwear-wool-coat-navy-s94411 | ERR | ✓ | — | 85 | ✗ | ✓ | 555 | 1502 |
| outerwear-wool-coat-olive-s41644 | ERR | ✓ | — | 40 | ✗ | ✓ | 788 | 1734 |
| outerwear-wool-coat-pink-s49823 | ERR | ✓ | — | 80 | ✗ | ✗ | 631 | 1398 |
| outerwear-wool-coat-white-s70062 | ERR | ✓ | — | 0 | ✗ | ✗ | 522 | 1410 |
| shoes-ankle-boots-beige-s86711 | ERR | ✓ | — | 41 | ✗ | ✓ | 555 | 1547 |
| shoes-ankle-boots-black-s9880 | ERR | ✓ | — | 31 | ✗ | ✓ | 682 | 1400 |
| shoes-ankle-boots-blue-s93827 | ERR | ✓ | — | 89 | ✗ | ✓ | 591 | 1685 |
| shoes-ankle-boots-brown-s47139 | ERR | ✓ | — | 50 | ✗ | ✓ | 590 | 2100 |
| shoes-ankle-boots-cream-s96899 | ERR | ✓ | — | 37 | ✗ | ✓ | 566 | 1806 |
| shoes-ankle-boots-grey-s33106 | ERR | ✓ | — | 57 | ✗ | ✓ | 607 | 1798 |
| shoes-ankle-boots-navy-s31129 | ERR | ✓ | — | 43 | ✗ | ✓ | 599 | 1531 |
| shoes-ankle-boots-olive-s87930 | ERR | ✓ | — | 46 | ✗ | ✓ | 563 | 2257 |
| shoes-ankle-boots-pink-s86541 | ERR | ✓ | — | 95 | ✗ | ✓ | 565 | 1685 |
| shoes-ankle-boots-white-s16348 | ERR | ✓ | — | 0 | ✗ | ✓ | 523 | 1586 |
| shoes-loafers-beige-s94404 | ERR | ✓ | — | 41 | ✗ | ✓ | 557 | 1342 |
| shoes-loafers-black-s17573 | ERR | ✓ | — | 0 | ✗ | ✓ | 553 | 1779 |
| shoes-loafers-blue-s36656 | ERR | ✓ | — | 81 | ✗ | ✓ | 497 | 1497 |
| shoes-loafers-brown-s54832 | ERR | ✓ | — | 50 | ✗ | ✓ | 553 | 1548 |
| shoes-loafers-cream-s71888 | ERR | ✓ | — | 41 | ✗ | ✓ | 560 | 1627 |
| shoes-loafers-grey-s75935 | ERR | ✓ | — | 65 | ✗ | ✓ | 554 | 1878 |
| shoes-loafers-navy-s73958 | ERR | ✓ | — | 75 | ✗ | ✓ | 508 | 1637 |
| shoes-loafers-olive-s95623 | ERR | ✓ | — | 57 | ✗ | ✓ | 701 | 1430 |
| shoes-loafers-pink-s29370 | ERR | ✓ | — | 99 | ✗ | ✓ | 617 | 1437 |
| shoes-loafers-white-s91337 | ERR | ✓ | — | 0 | ✗ | ✓ | 618 | 1701 |
| shoes-sneakers-beige-s14996 | ERR | ✓ | — | 71 | ✗ | ✓ | 496 | 1578 |
| shoes-sneakers-brown-s75424 | ERR | ✓ | — | 50 | ✗ | ✓ | 555 | 1330 |
| shoes-sneakers-cream-s92480 | ERR | ✓ | — | 44 | ✗ | ✓ | 455 | 1881 |
| shoes-sneakers-grey-s81743 | ERR | ✓ | — | 65 | ✗ | ✓ | 556 | 1757 |
| shoes-sneakers-navy-s12470 | ERR | ✓ | — | 84 | ✗ | ✗ | 679 | 1449 |
| shoes-sneakers-pink-s67882 | ERR | ✓ | — | 82 | ✗ | ✓ | 557 | 1511 |
| shoes-sneakers-white-s11929 | ERR | ✓ | — | 0 | ✗ | ✓ | 577 | 1310 |
| tops-button-down-beige-s22525 | ERR | ✓ | — | 43 | ✗ | ✓ | 560 | 1845 |
| tops-button-down-black-s45694 | ERR | ✓ | — | 31 | ✗ | ✓ | 586 | 1412 |
| tops-button-down-blue-s41129 | ERR | ✓ | — | 48 | ✗ | ✓ | 522 | 1319 |
| tops-button-down-brown-s82953 | ERR | ✓ | — | 50 | ✗ | ✓ | 566 | 1488 |
| tops-button-down-cream-s100009 | ERR | ✓ | — | 49 | ✗ | ✓ | 555 | 1317 |
| tops-button-down-grey-s80408 | ERR | ✓ | — | 41 | ✗ | ✓ | 555 | 1385 |
| tops-button-down-navy-s78431 | ERR | ✓ | — | 81 | ✗ | ✓ | 684 | 1579 |
| tops-button-down-olive-s91040 | ERR | ✓ | — | 49 | ✗ | ✓ | 561 | 1752 |
| tops-button-down-pink-s33843 | ERR | ✓ | — | 119 | ✗ | ✓ | 696 | 1458 |
| tops-button-down-white-s19458 | ERR | ✓ | — | 0 | ✗ | ✓ | 610 | 1912 |
| tops-crew-tee-beige-s18776 | ERR | ✓ | — | 43 | ✗ | ✓ | 639 | 1494 |
| tops-crew-tee-black-s74649 | ERR | ✓ | — | 31 | ✗ | ✓ | 591 | 1318 |
| tops-crew-tee-blue-s74692 | ERR | ✓ | — | 75 | ✗ | ✓ | 605 | 1459 |
| tops-crew-tee-brown-s11908 | ERR | ✓ | — | 35 | ✗ | ✓ | 521 | 1804 |
| tops-crew-tee-cream-s28964 | ERR | ✓ | — | 38 | ✗ | ✓ | 581 | 1291 |
| tops-crew-tee-grey-s13971 | ERR | ✓ | — | 26 | ✗ | ✓ | 520 | 1256 |
| tops-crew-tee-navy-s11994 | ERR | ✓ | — | 73 | ✗ | ✓ | 667 | 1300 |
| tops-crew-tee-olive-s19995 | ERR | ✓ | — | 42 | ✗ | ✓ | 551 | 1175 |
| tops-crew-tee-pink-s67406 | ERR | ✓ | — | 94 | ✗ | ✓ | 703 | 1688 |
| tops-crew-tee-white-s48413 | ERR | ✓ | — | 0 | ✗ | ✓ | 555 | 1749 |
| tops-hoodie-beige-s84244 | ERR | ✓ | — | 50 | ✗ | ✓ | 553 | 1750 |
| tops-hoodie-black-s7413 | ERR | ✓ | — | 45 | ✗ | ✓ | 715 | 1492 |
| tops-hoodie-blue-s63392 | ERR | ✓ | — | 77 | ✗ | ✓ | 558 | 1394 |
| tops-hoodie-brown-s44672 | ERR | ✓ | — | 50 | ✗ | ✓ | 562 | 1572 |
| tops-hoodie-cream-s61728 | ERR | ✓ | — | 41 | ✗ | ✓ | 631 | 1579 |
| tops-hoodie-grey-s2671 | ERR | ✓ | — | 20 | ✗ | ✓ | 616 | 1524 |
| tops-hoodie-navy-s100694 | ERR | ✓ | — | 79 | ✗ | ✓ | 616 | 2133 |
| tops-hoodie-olive-s85463 | ERR | ✓ | — | 50 | ✗ | ✓ | 505 | 1415 |
| tops-hoodie-pink-s56106 | ERR | ✓ | — | 98 | ✗ | ✓ | 609 | 1752 |
| tops-hoodie-white-s81177 | ERR | ✓ | — | 0 | ✗ | ✓ | 615 | 1581 |
| tops-knit-sweater-beige-s81754 | ERR | ✓ | — | 50 | ✗ | ✓ | 682 | 1806 |
| tops-knit-sweater-black-s4923 | ERR | ✓ | — | 19 | ✗ | ✓ | 577 | 1670 |
| tops-knit-sweater-blue-s45478 | ERR | ✓ | — | 75 | ✗ | ✓ | 667 | 1824 |
| tops-knit-sweater-brown-s42182 | ERR | ✓ | — | 43 | ✗ | ✓ | 597 | 1352 |
| tops-knit-sweater-cream-s59238 | ERR | ✓ | — | 44 | ✗ | ✓ | 570 | 1948 |
| tops-knit-sweater-grey-s84757 | ERR | ✓ | — | 45 | ✗ | ✓ | 603 | 1212 |
| tops-knit-sweater-navy-s82780 | ERR | ✓ | — | 77 | ✗ | ✓ | 556 | 1316 |
| tops-knit-sweater-olive-s82973 | ERR | ✓ | — | 27 | ✗ | ✓ | 551 | 1566 |
| tops-knit-sweater-pink-s70896 | ERR | ✓ | — | 94 | ✗ | ✓ | 521 | 1631 |
| tops-knit-sweater-white-s78687 | ERR | ✓ | — | 0 | ✗ | ✓ | 615 | 1586 |
| tops-shirt-dress-beige-s50375 | ERR | ✓ | — | 52 | ✗ | ✓ | 564 | 1469 |
| tops-shirt-dress-black-s73544 | ERR | ✓ | — | 32 | ✗ | ✓ | 576 | 1466 |
| tops-shirt-dress-blue-s25011 | ERR | ✓ | — | 68 | ✗ | ✓ | 465 | 2267 |
| tops-shirt-dress-brown-s10803 | ERR | ✓ | — | 42 | ✗ | ✓ | 588 | 1516 |
| tops-shirt-dress-cream-s27859 | ERR | ✓ | — | 49 | ✗ | ✓ | 592 | 2223 |
| tops-shirt-dress-grey-s64290 | ERR | ✓ | — | 41 | ✗ | ✓ | 567 | 1685 |
| tops-shirt-dress-navy-s62313 | ERR | ✓ | — | 61 | ✗ | ✓ | 557 | 1582 |
| tops-shirt-dress-olive-s18890 | ERR | ✓ | — | 31 | ✗ | ✓ | 724 | 1557 |
| tops-shirt-dress-pink-s17725 | ERR | ✓ | — | 95 | ✗ | ✓ | 584 | 1316 |
| tops-shirt-dress-white-s47308 | ERR | ✓ | — | 0 | ✗ | ✓ | 509 | 1604 |
| tops-silk-blouse-beige-s14310 | ERR | ✓ | — | 47 | ✗ | ✗ | 502 | 1351 |
| tops-silk-blouse-black-s37479 | ERR | ✓ | — | 42 | ✗ | ✓ | 700 | 1574 |
| tops-silk-blouse-blue-s7890 | ERR | ✓ | — | 51 | ✗ | ✓ | 569 | 1407 |
| tops-silk-blouse-brown-s74738 | ERR | ✓ | — | 43 | ✗ | ✓ | 671 | 1439 |
| tops-silk-blouse-cream-s91794 | ERR | ✓ | — | 40 | ✗ | ✓ | 631 | 1650 |
| tops-silk-blouse-grey-s47169 | ERR | ✓ | — | 65 | ✗ | ✗ | 617 | 1405 |
| tops-silk-blouse-navy-s45192 | ERR | ✓ | — | 60 | ✗ | ✓ | 563 | 1208 |
| tops-silk-blouse-olive-s15529 | ERR | ✓ | — | 16 | ✗ | ✓ | 548 | 1420 |
| tops-silk-blouse-pink-s100604 | ERR | ✓ | — | 47 | ✗ | ✗ | 697 | 1473 |
| tops-silk-blouse-white-s11243 | ERR | ✓ | — | 0 | ✗ | ✗ | 605 | 1476 |


## How to read this

- **Category accuracy** — most important; if a model can't tell tops from bottoms, nothing else matters.
- **Color score** — `1.0` is identical hex; `0.5` ≈ 100 RGB units off (noticeable but related shade); `0.0` ≈ unrelated color.
- **Subcategory hit** — binary keyword match. Looser than category, looks for any of the ground-truth keywords in the model's free-text subcategory.
- **Latency** — wall-clock including network. Different regions/keys will skew this.
