const String memorialAssetBase = 'https://api.garca.sp.gov.br';

String memorialSepultadoImageUrl(List<String> images) {
  if (images.isNotEmpty) {
    final first = images.first.trim();
    if (first.startsWith('http://') || first.startsWith('https://')) {
      return first;
    }
    return '$memorialAssetBase/images/sepultados/$first';
  }
  return '$memorialAssetBase/sep.jpeg';
}

String? memorialCommentImageUrl(String? filename) {
  if (filename == null || filename.isEmpty) return null;
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }
  return '$memorialAssetBase/images/comentarios/$filename';
}

String memorialUserImageUrl(String? image) {
  if (image == null || image.isEmpty) {
    return '$memorialAssetBase/users/default-user.png';
  }
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }
  return '$memorialAssetBase/images/users/$image';
}
