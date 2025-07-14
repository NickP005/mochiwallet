# Mochimo Wallet

A browser extension wallet and mobile app for the Mochimo cryptocurrency.

## Prerequisiti

- Node.js >= 16.x e npm
- [Capacitor CLI](https://capacitorjs.com/docs/getting-started):  
  ```sh
  npm install -g @capacitor/cli
  ```
- Xcode (per build iOS)
- Android Studio (per build Android)
- CocoaPods (per dipendenze native iOS)

### Installazione CocoaPods su Mac

**Per Mac M1/M2/M3/Intel con Ruby >= 3.1:**

1. Installa Ruby con Homebrew:
   ```sh
   brew install ruby
   ```
   
2. Aggiungi Ruby di Homebrew al PATH:
   ```sh
   echo 'export PATH="/opt/homebrew/opt/ruby/bin:$PATH"' >> ~/.zshrc
   echo 'export PATH="/opt/homebrew/lib/ruby/gems/3.4.0/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ruby --version   # Deve essere almeno 3.1.x
   ```
   > Sostituisci `3.4.0` con la versione Ruby installata (controlla con `ls /opt/homebrew/lib/ruby/gems/`).

3. Installa CocoaPods:
   ```sh
   gem install cocoapods
   pod --version
   ```

## Installazione dipendenze

```sh
npm install
```

## Comandi principali

| Comando              | Descrizione                                                                 |
|----------------------|-----------------------------------------------------------------------------|
| `npm run build:web`  | Build della webapp in `dist/web`                                            |
| `npm run preview`    | Serve la webapp reale da `dist/web`                                         |
| `npm run build:ios`  | Build webapp, sync Capacitor, apre Xcode per sviluppo iOS                   |

## Build iOS (Capacitor)

### Setup iOS (già completato)

Il progetto è già configurato per iOS. Se hai bisogno di riconfigurare:

1. **Inizializza Capacitor (solo se necessario):**
   ```sh
   npx cap init
   ```

2. **Aggiungi piattaforma iOS (solo se necessario):**
   ```sh
   npx cap add ios
   ```

### Build e test iOS

1. **Build completa e apertura Xcode:**
   ```sh
   npm run build:ios
   ```
   Questo comando:
   - Costruisce la webapp in modalità web
   - Sincronizza Capacitor (`npx cap sync ios`)
   - Apre Xcode automaticamente

2. **Build veloce senza aprire Xcode:**
   ```sh
   npm run build:web && npx cap sync ios
   ```

3. **In Xcode:**
   - Seleziona il target **App** nella barra laterale
   - Scegli un simulatore o dispositivo fisico dal menu in alto
   - Premi **Command+R** o clicca "Run" ▶️ per compilare e lanciare l'app

### Risoluzione problemi iOS

- **Errori CocoaPods:**
  ```sh
  cd ios/App/App && pod install && cd ../../..
  ```

- **Comando `pod` non trovato:**
  Verifica che Ruby e CocoaPods siano nel PATH:
  ```sh
  ruby --version
  pod --version
  ```

- **Errori di provisioning/certificati:**
  Controlla in Xcode > Signing & Capabilities

- **Primi setup Xcode:**
  ```sh
  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
  sudo xcodebuild -license
  ```

### Note importanti

- **Non serve un account Apple** per testare su simulatore
- **Per dispositivi fisici** serve un account Apple Developer e provisioning profile
- **Se modifichi il codice web**, riesegui `npm run build:ios`
- **Le icone iOS** vanno aggiornate manualmente in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

## Configurazione

Il progetto include:
- **Capacitor config**: `capacitor.config.ts`
- **App ID**: `com.mochimo.ioswallet`
- **App Name**: `Mochimo Wallet`
- **Web directory**: `dist`

## Development workflow

1. Sviluppa e testa con la webapp:
   ```sh
   npm run dev
   ```

2. Per testare su iOS:
   ```sh
   npm run build:ios
   ```

3. Per build veloci durante sviluppo:
   ```sh
   npm run build:web && npx cap sync ios
   ```

## Struttura progetto

```
mochiwallet/
├── src/                    # Sorgenti webapp
├── dist/                   # Build output
├── ios/                    # Progetto iOS nativo
├── capacitor.config.ts     # Configurazione Capacitor
└── package.json           # Dipendenze e scripts
```

## Licenza

MIT
