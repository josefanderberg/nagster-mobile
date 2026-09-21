# Tjat - mobilapp

Mobilversionen av [Tjat](https://github.com/josefanderberg/nagster-web), byggd med React Native och Expo. Hämtar sin data från samma backend som webbappen: [nagster-api](https://github.com/josefanderberg/nagster-api).

Mobilen har två saker webben inte kan: **rörelsevakten**, som med accelerometern känner av om du plockar upp telefonen, och **vibrationen** som straffar dig när du gör det.

## Starta

Kräver [Node.js](https://nodejs.org) 20 eller senare, samt appen **Expo Go** på telefonen (finns gratis i App Store och Google Play).

**1. Starta backend** i ett eget terminalfönster. Flaggan gör att telefonen kan nå API:et, inte bara datorn:

```bash
cd nagster-api
dotnet run --urls http://0.0.0.0:5080
```

**2. Starta mobilappen:**

```bash
npm install
npx expo start
```

**3. Scanna QR-koden** som visas i terminalen med telefonens kamera. Telefonen och datorn måste vara på samma wifi.

Fungerar inte wifit (till exempel på skolans nät) går trafiken via internet med `npx expo start --tunnel` i stället.

Appen går också att köra i en simulator: tryck `i` för iOS eller `a` för Android i terminalen.

## Skärmar

| Skärm | Innehåll |
|---|---|
| **Hem** | Listan med tjat, hämtad från API:et |
| **Nytt tjat** | Spela in rösten, välj tid, slå på rörelsevakten |
| **Vakt** | Nedräkning i dimmat läge, larm och snooze |

## Tekniska val

- **Expo** i stället för rent React Native: appen går att köra på en riktig telefon utan Xcode eller Android Studio, vilket gör den lätt att testa och visa upp.
- **expo-audio** och inte `expo-av`: det senare är utfasat i SDK 54 och framåt.
- **expo-sensors** för accelerometern och **expo-haptics** för vibrationen - båda funktionerna saknas helt i en webbläsare, och är själva anledningen till att appen finns som mobilapp.
- **API-adressen hämtas automatiskt** från Expos egen värdadress, eftersom `localhost` på telefonen syftar på telefonen själv och inte på datorn.
- **Ingen egen databas i mobilen**: samma backend som webben, så listan är densamma oavsett var man tittar.
