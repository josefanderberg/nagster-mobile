# Tjat - mobilapp

Mobilversionen av [Tjat](https://github.com/josefanderberg/nagster-web), byggd med React Native och Expo. Hämtar sin data från samma backend som webbappen: [nagster-api](https://github.com/josefanderberg/nagster-api).

Mobilen har två saker webben inte kan: **rörelsevakten**, som med accelerometern känner av om du plockar upp telefonen, och **vibrationen** som går igång när du gör det.

## Krav

- [.NET SDK 10](https://dotnet.microsoft.com/download/dotnet/10.0) för backend
- [Node.js 22](https://nodejs.org) (eller 20.19+)
- Appen **Expo Go** på telefonen, gratis i App Store och Google Play

## Starta

**1. Backend** i en terminal. Flaggan gör att telefonen kan nå API:et, inte bara datorn:

```bash
git clone https://github.com/josefanderberg/nagster-api.git
cd nagster-api
dotnet run --urls http://0.0.0.0:5080
```

**2. Mobilappen** i en ny terminal:

```bash
git clone https://github.com/josefanderberg/nagster-mobile.git
cd nagster-mobile
npm install
npx expo start
```

**3. Scanna QR-koden** i terminalen med telefonens kamera. Telefonen och datorn måste vara på samma wifi.

Fungerar inte wifit, till exempel på skolans nät, går trafiken via internet med `npx expo start --tunnel` i stället. Appen går också att köra i en simulator: tryck `i` för iOS eller `a` för Android.

## Så används den

- **Hem:** dra i ringen för att välja tid, spela in ett tjat med mikrofonen och tryck Starta. Listan under visar alla tjat och hämtas från API:et.
- **Detalj:** tryck på ett tjat i listan för att se det och lyssna på inspelningen.
- **Låset uppe till höger** slår på rörelsevakten. Lägg telefonen på bordet, skärmen blir svart och plockar du upp den blir den röd och vibrerar. Håll inne i tre sekunder för att stänga av.

## Tekniska val

- **Expo** i stället för rent React Native - appen går att köra på en riktig telefon utan Xcode eller Android Studio
- **expo-audio** och inte `expo-av`, som är utfasat från SDK 54
- **expo-sensors** för accelerometern och **Vibration** för larmet, funktioner som saknas i en webbläsare och som är hela anledningen till att appen finns som mobilapp
- **API-adressen hämtas automatiskt** från Expos värdadress, eftersom `localhost` på telefonen syftar på telefonen själv
- **Ingen egen databas i mobilen** - samma backend som webben, så listan är densamma oavsett var man tittar
