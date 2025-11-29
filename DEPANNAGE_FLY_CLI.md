# 🔧 Dépannage Installation Fly CLI

## Solution 1 : Vérifier l'installation

1. **Vérifiez si Fly est installé** :
   ```powershell
   Test-Path "$env:USERPROFILE\.fly\bin\fly.exe"
   ```
   Si ça retourne `True`, Fly est installé mais pas dans le PATH.

2. **Ajoutez Fly au PATH pour cette session** :
   ```powershell
   $env:PATH += ";$env:USERPROFILE\.fly\bin"
   ```

3. **Testez** :
   ```powershell
   fly version
   ```

## Solution 2 : Installation manuelle

Si l'installation automatique ne fonctionne pas :

1. **Téléchargez Fly CLI manuellement** :
   - Allez sur : https://fly.io/docs/hands-on/install-flyctl/
   - Téléchargez la version Windows
   - Ou utilisez cette commande :
   ```powershell
   Invoke-WebRequest -Uri "https://github.com/superfly/flyctl/releases/latest/download/flyctl_windows_amd64.zip" -OutFile "$env:TEMP\flyctl.zip"
   ```

2. **Extrayez dans un dossier** :
   ```powershell
   Expand-Archive -Path "$env:TEMP\flyctl.zip" -DestinationPath "$env:USERPROFILE\.fly" -Force
   ```

3. **Ajoutez au PATH** :
   ```powershell
   $env:PATH += ";$env:USERPROFILE\.fly"
   ```

4. **Testez** :
   ```powershell
   fly version
   ```

## Solution 3 : Utiliser le chemin complet

En attendant de résoudre le PATH, utilisez le chemin complet :

```powershell
& "$env:USERPROFILE\.fly\bin\fly.exe" version
```

Pour toutes les commandes, remplacez `fly` par `& "$env:USERPROFILE\.fly\bin\fly.exe"`

## Solution 4 : Installation via Scoop (si vous avez Scoop)

```powershell
scoop install flyctl
```

## Solution 5 : Installation via Chocolatey (si vous avez Chocolatey)

```powershell
choco install flyctl
```

