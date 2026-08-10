import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/garca_pet/data/garca_pet_exception.dart';
import 'package:prefeitura_app/features/garca_pet/domain/models/pet_model.dart';
import 'package:prefeitura_app/features/garca_pet/domain/repositories/garca_pet_repository.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/theme/garca_pet_colors.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/garca_pet_error_handler.dart';

const _reportReasons = [
  'Anúncio falso ou enganoso',
  'Conteúdo inadequado',
  'Suspeita de maus-tratos',
  'Pet já adotado ou indisponível',
  'Spam ou anúncio duplicado',
  'Outro',
];

Future<bool?> showPetReportSheet(
  BuildContext context, {
  required PetModel pet,
}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (ctx) {
      return Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(ctx).bottom),
        child: _PetReportSheetBody(pet: pet),
      );
    },
  );
}

class _PetReportSheetBody extends StatefulWidget {
  const _PetReportSheetBody({required this.pet});

  final PetModel pet;

  @override
  State<_PetReportSheetBody> createState() => _PetReportSheetBodyState();
}

class _PetReportSheetBodyState extends State<_PetReportSheetBody> {
  final _repository = GarcaPetRepository();
  final _descriptionCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  String? _reason;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _descriptionCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_reason == null || _reason!.isEmpty) {
      setState(() => _error = 'Selecione o motivo da denúncia.');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final data = await _repository.reportPet(
        petId: widget.pet.id,
        reason: _reason!,
        description: _descriptionCtrl.text,
      );
      if (!mounted) return;
      Navigator.pop(context, true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text((data['message'] ?? 'Denúncia registrada.').toString()),
          backgroundColor: GarcaPetColors.primary,
        ),
      );
    } on GarcaPetException catch (e) {
      if (!mounted) return;
      if (await GarcaPetErrorHandler.handle(context, e)) {
        setState(() => _loading = false);
        return;
      }
      setState(() {
        _error = e.message;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Não foi possível enviar a denúncia.';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Denunciar "${widget.pet.name}"',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Sua denúncia será analisada pela equipe. Informações falsas podem ser descartadas.',
              style: TextStyle(fontSize: 13, height: 1.35),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _reason,
              decoration: const InputDecoration(
                labelText: 'Motivo *',
                border: OutlineInputBorder(),
              ),
              items: _reportReasons
                  .map((r) => DropdownMenuItem(value: r, child: Text(r)))
                  .toList(),
              onChanged: _loading
                  ? null
                  : (value) => setState(() {
                        _reason = value;
                        _error = null;
                      }),
              validator: (v) =>
                  (v == null || v.isEmpty) ? 'Selecione um motivo.' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _descriptionCtrl,
              maxLines: 3,
              enabled: !_loading,
              decoration: const InputDecoration(
                labelText: 'Detalhes (opcional)',
                hintText: 'Descreva o que motivou a denúncia',
                border: OutlineInputBorder(),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(_error!, style: const TextStyle(color: GarcaPetColors.error)),
            ],
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _loading ? null : _submit,
              style: FilledButton.styleFrom(
                backgroundColor: GarcaPetColors.error,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: _loading
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Enviar denúncia'),
            ),
          ],
        ),
      ),
    );
  }
}
