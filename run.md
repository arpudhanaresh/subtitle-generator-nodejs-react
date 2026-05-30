# Local Run Commands

```powershell
Copy-Item development.env api\.env
Get-Content development.env | Where-Object { $_ -match '^VITE_' } | Set-Content app\.env
```

```powershell
cd api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 5000
```

```powershell
cd ..\app
npm install
npm run dev
```

```powershell
cd ..\app
npm run build
```

```powershell
cd ..\api
.\.venv\Scripts\Activate.ps1
python main.py
```
