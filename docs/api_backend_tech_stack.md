# Kapitola: 6.4. Tech Stack (API Backend)

Tento dokument zpracovává výběr technologií, případně jejich obhajobu, výhradně pro oblast API backendu. Výběr poskytovatele infrastruktury a sítě není zahrnut, jelikož je plně v kompetenci administrátora (VPS admin).

---

## 1. Kategorizace technologických rozhodnutí
Pro část API backendu bylo nutné rozhodnout o následujících technologiích:
- Programovací jazyk a framework
- Databázový systém

## 2. Definice kritérií rozhodování
Pro hodnocení technologií byla stanovena následující kritéria (s váhou od 1 do 10):

**Pro framework a programovací jazyk:**
- Shoda se zadáním od vyučujícího (váha 10)
- Rychlost startu a vývoje "z nuly na deploy" (váha 8)
- Dostupná komunita, tutoriály a zdroje (váha 6)

**Pro databázový systém:**
- Podpora nezbytných funkcí pro integritu dat - např. bezproblémové Cascade on Delete (váha 9)
- Doporučení odborníka projektu (pan Papula) (váha 8)
- Spolehlivost a snadnost integrace v rámci aplikace (váha 5)

## 3. Rozhodovací matice a vyhodnocení

### Původ dat a způsob hodnocení
Hodnoty v matici představují odborný odhad vývojáře zpracovávajícího tuto sekci. Čísla nespadla "z nebe", ale vycházejí buď z přímých požadavků na projekt (požadavek učitele na PHP), z doporučení a konzultací (VPS admin kvůli rychlosti, pan Papula kvůli výkonu) nebo z praktického výzkumu ohledně rychlosti vývoje.

### 3.1 Programovací jazyk backendu a framework

**Způsob hodnocení:** Bodové ohodnocení "Shody se zadáním" dosahuje maxima kvůli prerekvizitě od vyučujícího. Hodnoty pro rychlost vývoje a komunitu vycházejí čistě ze sledování 4 různých videí učících základy obou frameworků na YouTube a dotazování 3 nezávislých LLM modelů (včetně rešerše Google), z čehož vyšla učící křivka a rychlost startu pro Laravel lépe.

**Hodnocení (1 - velmi špatné, 5 - velmi dobré):**

| Technologie | Shoda se zadáním (10) | Rychlost vývoje (8) | Komunita/Zdroje (6) | Celkové skóre |
|-------------|-----------------------|---------------------|---------------------|----------------|
| **Laravel** | 5 * 10 = 50           | 5 * 8 = 40          | 5 * 6 = 30          | **120**        |
| **Symfony** | 5 * 10 = 50           | 3 * 8 = 24          | 4 * 6 = 24          | 98             |

**Finální rozhodnutí:** Laravel (Jazyk PHP)  
**Zdůvodnění:** Rozhodnutí pro jazyk PHP bylo předem dané a nutné k absolvování. Z nejčastěji doporučovaných frameworků v komunitě (Laravel, Symfony) po detailnějším výzkumu zvítězil Laravel. Hlavním důvodem je skutečnost, že umožňuje extrémně rychlé doručení produktu (cesta z prázdného projektu do funkčního API) a má přívětivější křivku učení do začátku.

### 3.2 Databázový systém

**Způsob hodnocení a zdroj bodů:** Hodnoty skóre pro "Doporučení odborníka" jsou uděleny na základě zpětné vazby od pana Papuly, který SQLite nedoporučil k produkci (0 b.), MySQL označil za relativně zastaralou možnost pro dnešní produkci (1 b.) a naopak explicitně doporučil systém MariaDB (5 b.). U kritéria "Integrace" ovšem vyhrává s nejvyšším počtem bodů SQLite, jelikož se VPS adminovi na začátku integrovala zcela nejsnáze bez nutnosti složitého nastavování.

**Hodnocení (0 - vůbec nedoporučeno, 5 - velmi dobré):**

| Technologie | Podpora funkcí (9) | Doporučení (P. Papula) (8) | Integrace (5) | Celkové skóre |
|-------------|--------------------|----------------------------|---------------|---------------|
| **SQLite**  | 2 * 9 = 18         | 0 * 8 = 0                  | 5 * 5 = 25    | 43            |
| **MySQL**   | 5 * 9 = 45         | 1 * 8 = 8                  | 3 * 5 = 15    | 68            |
| **MariaDB** | 5 * 9 = 45         | 5 * 8 = 40                 | 3 * 5 = 15    | **100**       |

**Finální rozhodnutí:** MariaDB  
**Zdůvodnění:** Původně jsme do návrhu architektury plně počítali s tradiční relacční databází MySQL. Nicméně z důvodu urychlení začátků vývoje se náš VPS admin rozhodl implementovat snazší SQLite. Záhy jsme však narazili na limitace této technologie – SQLite postrádala funkcionalitu u složitějších operací s klíči, jako je kaskádové odstraňování záznamů (cascade on delete). Nakonec, na odborné doporučení pana Papuly, byla databáze změněna z SQLite rovnou na MariaDB jakožto moderní náhradu za původně zvažované MySQL.
