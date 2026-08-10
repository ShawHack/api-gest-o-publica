/// URLs públicas dos assets do site GarçaPet (mesmos do build em `/garcapet/static/media/`).
abstract final class GarcaPetMediaUrls {
  static const String webBase = 'https://api.garca.sp.gov.br';

  static String samaMedia(String fileName) =>
      '$webBase/garcapet/static/media/$fileName';

  static const String vacinacaoBannerMobile =
      '$webBase/vacinacao/banner-vacinacao-mobile.png';

  /// Selo exibido no site quando a campanha está encerrada.
  static const String castracaoClosedNotice =
      '$webBase/garcapet/static/media/avisocastracao.f7c350443c5c56303e10.png';
}
