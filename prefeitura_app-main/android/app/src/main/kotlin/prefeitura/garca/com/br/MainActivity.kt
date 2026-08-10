package prefeitura.garca.com.br

import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    // Evita reabrir a última tela (ex.: /memorial) ao iniciar o app.
    override fun shouldRestoreAndSaveState(): Boolean = false
}
