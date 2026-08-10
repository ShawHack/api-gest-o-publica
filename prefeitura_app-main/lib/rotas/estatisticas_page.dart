// lib/estatisticas_page.dart (revisado)
import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:firebase_database/firebase_database.dart';

import 'main.dart' show MyApp, getRotasDatabase;

class EstatisticasPage extends StatefulWidget {
  const EstatisticasPage({super.key});

  @override
  State<EstatisticasPage> createState() => _EstatisticasPageState();
}

class _EstatisticasPageState extends State<EstatisticasPage> {
  DatabaseReference? _upasRef;

  @override
  void initState() {
    super.initState();
    getRotasDatabase().then((db) {
      if (mounted) setState(() => _upasRef = db.ref('upas'));
    });
  }

  @override
  Widget build(BuildContext context) {
    final ref = _upasRef;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Estatísticas'),
        backgroundColor: MyApp.kBlue,
        foregroundColor: Colors.white,
      ),
      body: Stack(
        children: [
          Positioned.fill(
            child: Image.asset('assets/fundo.jpeg', fit: BoxFit.cover),
          ),
          Positioned.fill(
            child: Container(color: Colors.white.withOpacity(0.45)),
          ),
          Positioned.fill(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 2.0, sigmaY: 2.0),
              child: const SizedBox.shrink(),
            ),
          ),
          SafeArea(
            child: ref == null
                ? const Center(child: CircularProgressIndicator())
                : StreamBuilder<DatabaseEvent>(
                    stream: ref.onValue,
                    builder: (context, snap) {
                      if (snap.connectionState == ConnectionState.waiting) {
                        return const Center(child: CircularProgressIndicator());
                      }
                      if (snap.hasError) {
                        return Padding(
                          padding: const EdgeInsets.all(16),
                          child: Text('Erro: ${snap.error}'),
                        );
                      }

                      final val = snap.data?.snapshot.value;
                      final list = _parseUpas(val);

                      final total = list.length;
                      final comCoord = list.where((e) => e.$1).length;
                      final comPlus = list.where((e) => e.$2).length;

                      final porMunicipio = <String, int>{};
                      for (final e in list) {
                        final m = e.$3;
                        if (m.isEmpty) continue;
                        porMunicipio[m] = (porMunicipio[m] ?? 0) + 1;
                      }
                      final topMunicipios = porMunicipio.entries.toList()
                        ..sort((a, b) => b.value.compareTo(a.value));

                      return ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          _KpiGrid(
                            values: [
                              ('Total de UPAs', '$total', Icons.agriculture),
                              ('Com coordenadas', '$comCoord', Icons.place),
                              ('Com Plus Code', '$comPlus', Icons.qr_code_2),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Card(
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'UPAs por município',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  if (topMunicipios.isEmpty)
                                    const Text('Sem dados.')
                                  else
                                    ...topMunicipios.take(10).map(
                                          (e) => ListTile(
                                            contentPadding: EdgeInsets.zero,
                                            leading: const Icon(Icons.location_city),
                                            title: Text(e.key),
                                            trailing: Text(
                                              e.value.toString(),
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                          ),
                                        ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Card(
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Padding(
                              padding: EdgeInsets.all(16),
                              child: RotasMaisAcessadas(),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        color: MyApp.kBlue,
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: const [
                Text(
                  'Secretaria de Inovação e Tecnologia',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: Colors.white),
                ),
                SizedBox(height: 4),
                Text(
                  '© SEMIT 2025',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 11, color: Colors.white70),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

List<(bool, bool, String)> _parseUpas(dynamic val) {
  final out = <(bool, bool, String)>[];
  if (val is! Map) return out;

  val.forEach((_, raw) {
    if (raw is! Map) return;
    final flat = _achatar(raw.map((k, v) => MapEntry(k.toString(), v)));

    final hasCoord = _toDouble(flat['latitude']) != null &&
        _toDouble(flat['longitude']) != null;
    final plus = _primeiroValor(flat, [
      'plus_code',
      'pluscode',
      'global_code',
      'compound_code',
    ]);
    final hasPlus = plus != null && plus.trim().isNotEmpty;
    final muni = _primeiroValor(flat, ['municipio', 'cidade']) ?? '';

    out.add((hasCoord, hasPlus, muni));
  });

  return out;
}

Map<String, dynamic> _achatar(Map<String, dynamic> raw) {
  final flat = <String, dynamic>{};

  void addPrefixed(String prefix, Map m) {
    m.forEach((k, v) {
      final key = '$prefix.${k.toString()}';
      flat[key] = v;
      if (v is Map) addPrefixed(key, v);
    });
  }

  raw.forEach((k, v) {
    flat[k] = v;
    if (v is Map) addPrefixed(k.toString(), v);
  });

  final copy = Map<String, dynamic>.from(flat);
  copy.forEach((k, v) {
    flat[k.toLowerCase().trim()] = v;
    flat[k.replaceAll('_', ' ').toLowerCase().trim()] = v;
  });

  return flat;
}

double? _toDouble(dynamic x) {
  if (x == null) return null;
  if (x is num) return x.toDouble();
  return double.tryParse(x.toString());
}

String? _primeiroValor(Map<String, dynamic> attrs, List<String> chaves) {
  for (final k in chaves) {
    final v = attrs[k] ??
        attrs[k.toLowerCase()] ??
        attrs[k.replaceAll('_', ' ').toLowerCase()];
    if (v != null && v.toString().trim().isNotEmpty) return v.toString();
  }
  for (final e in attrs.entries) {
    final lk = e.key.toLowerCase();
    if (chaves.any((c) => lk.contains(c.toLowerCase()))) {
      final v = e.value?.toString().trim();
      if (v != null && v.isNotEmpty) return v;
    }
  }
  return null;
}

class _KpiGrid extends StatelessWidget {
  final List<(String, String, IconData)> values;
  const _KpiGrid({required this.values});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Row(
      children: values
          .map(
            (e) => Expanded(
              child: Card(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
                  child: Column(
                    children: [
                      Icon(e.$3, color: cs.primary),
                      const SizedBox(height: 8),
                      Text(e.$1, textAlign: TextAlign.center),
                      const SizedBox(height: 6),
                      Text(
                        e.$2,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          )
          .toList(),
    );
  }
}

class RotasMaisAcessadas extends StatefulWidget {
  const RotasMaisAcessadas({super.key});

  @override
  State<RotasMaisAcessadas> createState() => _RotasMaisAcessadasState();
}

class _RotasMaisAcessadasState extends State<RotasMaisAcessadas> {
  DatabaseReference? _ref;

  @override
  void initState() {
    super.initState();
    getRotasDatabase().then((db) {
      if (mounted) {
        setState(() => _ref = db.ref('estatisticas/rotas/porRota'));
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final ref = _ref;
    if (ref == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return StreamBuilder<DatabaseEvent>(
      stream: ref.onValue,
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snap.hasError) {
          return const Text('Erro ao carregar as rotas mais acessadas.');
        }
        if (!snap.hasData || snap.data?.snapshot.value == null) {
          return const Text('Nenhuma rota acessada ainda.');
        }

        final data = snap.data?.snapshot.value as Map? ?? {};
        final rotas = data.entries.map((e) {
          final key = e.key as String;
          final value = e.value as Map? ?? {};
          final total = value['totalGeral'] as int? ?? 0;
          return MapEntry(key, total);
        }).toList();

        rotas.sort((a, b) => b.value.compareTo(a.value));
        final topRotas = rotas.take(10).toList();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Top 10 Rotas Mais Acessadas',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            if (topRotas.isEmpty)
              const Text('Sem dados de rotas.')
            else
              ...topRotas.map(
                (e) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.route),
                  title: Text(e.key),
                  trailing: Text(
                    e.value.toString(),
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
