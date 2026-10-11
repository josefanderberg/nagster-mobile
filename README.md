# Tjat - mobilapp

Mobilversionen av [Tjat](https://github.com/josefanderberg/nagster-web), byggd med React Native och Expo. Hämtar sin data från samma backend som webbappen: [nagster-api](https://github.com/josefanderberg/nagster-api).

Mobilen har saker webben inte kan: **rörelsevakten**, som med accelerometern känner av om du plockar upp telefonen, **vibrationen** som går igång när du gör det, och **larmnotiser med din egen röst** som tjatar även när appen är stängd och telefonen låst.

## Krav

- [.NET SDK 10](https://dotnet.microsoft.com/download/dotnet/10.0) för backend
- [Node.js 22](https://nodejs.org) (eller 20.19+)
- Ett **development-bygge** av appen på telefonen (byggs med EAS, se nedan). Appen går inte längre att köra i Expo Go - notiser med eget ljud kräver ett riktigt bygge.

## Starta

**1. Backend** i en terminal. API:et lyssnar på hela nätet så att telefonen når det:

```bash
git clone https://github.com/josefanderberg/nagster-api.git
cd nagster-api
dotnet run
```

**2. Mobilappen** i en ny terminal:

```bash
git clone https://github.com/josefanderberg/nagster-mobile.git
cd nagster-mobile
npm install
npx expo start
```

**3. Öppna Tjat-appen** (dev-bygget) på telefonen och välj servern i listan. Telefonen och datorn måste vara på samma wifi.

## Bygga appen

Byggena görs i molnet med [EAS](https://docs.expo.dev/build/introduction/) - inget lokalt Xcode behövs:

```bash
npm i -g eas-cli
eas login
eas build --profile development --platform ios
```

För TestFlight: `eas build --profile production --platform ios` följt av `eas submit --platform ios --latest`. Release-byggen pratar med adressen i `eas.json` (`EXPO_PUBLIC_API_HOST`).

## Så används den

- **Hem:** dra i ringen för att välja tid, spela in ett tjat med mikrofonen och tryck Starta. Listan under visar alla tjat och hämtas från API:et.
- **Detalj:** tryck på ett tjat i listan för att se det och lyssna på inspelningen.
- **Låset uppe till höger** slår på rörelsevakten. Lägg telefonen på bordet, skärmen blir svart och plockar du upp den blir den röd och vibrerar. Håll inne i tre sekunder för att stänga av.

## Tekniska val

- **Expo med EAS-byggen** i stället för rent React Native - molnbyggen utan lokalt Xcode, men ändå en riktig fristående app
- **expo-audio** och inte `expo-av`, som är utfasat från SDK 54
- **Lokala notiser med egen röst som larmljud**: iOS spelar bara upp egna notisljud i okomprimerade format från appens `Library/Sounds`, därför spelas tjatet in som wav på iOS och en kopia sparas lokalt. Notisen tjatar alltså med din röst även när appen är dödad.
- **Fast sluttid i stället för nedräknare** - timern räknar mot en tidsstämpel, så den visar rätt även efter en stund i bakgrunden, och en dödad app återupptar tjatet från en liten JSON-fil
- **expo-sensors** för accelerometern och **Vibration** för larmet, funktioner som saknas i en webbläsare och som är hela anledningen till att appen finns som mobilapp
- **API-adressen hämtas automatiskt** från Expos värdadress i dev, eftersom `localhost` på telefonen syftar på telefonen själv; release-byggen får adressen inbakad från `eas.json`
- **Ingen egen databas i mobilen** - samma backend som webben, så listan är densamma oavsett var man tittar

## Kända begränsningar

- Ljudlös-knappen tystar notisljud - att gå förbi den kräver Apples särskilda tillstånd för critical alerts
- Notisljud får vara max 30 sekunder - längre inspelningar får systemljudet i stället
- På Android används systemets notisljud än så länge - egna ljud per tjat kräver en annan lösning där
