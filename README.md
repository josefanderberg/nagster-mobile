# Tjat - mobilapp

Mobilversionen av [Tjat](https://github.com/josefanderberg/nagster-web), byggd med React Native och Expo. Allt sparas i telefonen, så appen fungerar utan nät. Webbappen har ett eget API ([nagster-api](https://github.com/josefanderberg/nagster-api)) som mobilen inte behöver.

Mobilen har saker webben inte kan: **rörelsevakten**, som med accelerometern känner av om du plockar upp telefonen, **vibrationen** som går igång när du gör det, och **larmnotiser med din egen röst** som tjatar även när appen är stängd och telefonen låst.

## Krav

- [Node.js 22](https://nodejs.org) (eller 20.19+)
- Ett **development-bygge** av appen på telefonen (byggs med EAS, se nedan). Appen går inte längre att köra i Expo Go - notiser med eget ljud kräver ett riktigt bygge.

## Starta

**1. Utvecklingsservern:**

```bash
git clone https://github.com/josefanderberg/nagster-mobile.git
cd nagster-mobile
npm install
npx expo start
```

**2. Öppna Tjat-appen** (dev-bygget) på telefonen och välj servern i listan. Telefonen och datorn måste vara på samma wifi, men bara under utveckling - det färdiga bygget klarar sig själv.

## Bygga appen

Byggena görs i molnet med [EAS](https://docs.expo.dev/build/introduction/) - inget lokalt Xcode behövs:

```bash
npm i -g eas-cli
eas login
eas build --profile development --platform ios
```

För TestFlight: `eas build --profile production --platform ios --auto-submit`.

## Så används den

- **Hem:** dra i ringen för att välja tid, spela in ditt tjat med den stora mikrofonknappen (eller skriv det) och tryck Starta - den blinkar grönt när det finns något att starta. Medan tjatet går är skärmen mörk och bara det som gäller syns: tiden, **Klart**, **Mer tid**, låset och tjatet i listan med Avbryt. När tiden är ute gäller bara **Klart** och **Snooza**. Mer tid och Snooza ger valen 1, 5 eller 10 minuter (sekunder för tjat under en minut), och väljer du inget blir det 2 minuter. Mer tid innan tiden är ute räknas inte som snooze eller försening. Går redan ett tjat hamnar ett nytt i en inre ring - högst två samtidigt.
- **Listan** visar alla tjat med sin tid och en grön bock med hur många gånger de klarats. Svep höger för att köra igen, vänster för att ta bort, och håll inne för att lyssna.
- **Detalj:** tryck på ett tjat i listan för att se det och lyssna på inspelningen. Tryck på titeln för att byta namn och på tiden för att ändra den, och på **Kör igen** för att starta tjatet en gång till med samma röst.
- **Kameran uppe till höger i rubriken** slår på ertappad-kameran: frontkameran tar en bild med stämpel när du snoozar eller klarar ett tjat. Bilderna syns som bevis i detaljvyn, där de kan visas stort och tas bort. **Siffran med stjärnan uppe till vänster** är din streak, tjat i rad klarade i tid.
- **Låset** slår på rörelsevakten. Lägg telefonen på bordet, skärmen blir svart och visar svagt hur lång tid som är kvar. Tar du i den för tidigt - den känner både lutning och vridning - blir den allt mer misstänksam, sedan röd och vibrerar för fullt - **Klar** avslutar tjatet och **Håll: öppna** tar dig tillbaka till appen. Plockar du upp den när tiden är ute släpper vakten direkt. Lämnar du appen med vakten på - hemskärmen, en annan app eller sidoknappen - öser den på med vibrerande notiser tills du är tillbaka. Håll inne i tre sekunder på den svarta skärmen för att stänga av.

## Tekniska val

- **Expo med EAS-byggen** i stället för rent React Native - molnbyggen utan lokalt Xcode, men ändå en riktig fristående app
- **expo-audio** och inte `expo-av`, som är utfasat från SDK 54
- **Lokala notiser med egen röst som larmljud**: iOS spelar bara upp egna notisljud i okomprimerade format från appens `Library/Sounds`, därför spelas tjatet in som wav på iOS och en kopia sparas lokalt. Notisen tjatar alltså med din röst även när appen är dödad.
- **Fast sluttid i stället för nedräknare** - timern räknar mot en tidsstämpel, så den visar rätt även efter en stund i bakgrunden, och en dödad app återupptar tjatet från en liten JSON-fil
- **En egen liten native-modul** (`modules/tjat-native`, lite Swift) för det Expos moduler inte kan: haptik i ringen medan mikrofonen spelar in, som iOS annars stänger av, ett ihållande larmsurr via Core Haptics, och skrivna tjat som läses in med telefonens bästa röst till en ljudfil så att även notisen kan läsa upp dem
- **expo-sensors** för accelerometern och **vibration** för larmet, funktioner som saknas i en webbläsare och som är hela anledningen till att appen finns som mobilapp
- **Lokal lagring i stället för API** - appen ska fungera i skogen utan täckning. Tjaten ligger i en JSON-fil och inspelningarna i `Documents/inspelningar` (expo-file-system). Ett tjat i taget och en kort historik behöver ingen databas.
- **Bara filnamnet sparas** för inspelningarna, eftersom iOS byter sökväg till appens mapp vid varje uppdatering

## Kända begränsningar

- Ljudlös-knappen tystar notisljud - att gå förbi den kräver Apples särskilda tillstånd för critical alerts
- Notisljud får vara max 30 sekunder - längre inspelningar får systemljudet i stället
- På Android används systemets notisljud än så länge - egna ljud per tjat kräver en annan lösning där
