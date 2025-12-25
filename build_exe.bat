pyinstaller --noconfirm --onefile --windowed --name "EasyFormatter" ^
  --add-data "app/ui/styles.qss;app/ui" ^
  --add-data "app/ui/themes/dark.qss;app/ui/themes" ^
  --add-data "config/settings.json;config" ^
  --clean main.py
