import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/garca_pet/data/garca_pet_exception.dart';
import 'package:prefeitura_app/features/garca_pet/domain/models/pet_model.dart';
import 'package:prefeitura_app/features/garca_pet/domain/repositories/garca_pet_repository.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/theme/garca_pet_colors.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/garca_pet_error_handler.dart';

Future<bool?> showAdoptionRequestSheet(
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
        child: _AdoptionRequestSheetBody(pet: pet),
      );
    },
  );
}

class _AdoptionRequestSheetBody extends StatefulWidget {
  const _AdoptionRequestSheetBody({required this.pet});

  final PetModel pet;

  @override
  State<_AdoptionRequestSheetBody> createState() => _AdoptionRequestSheetBodyState();
}

class _AdoptionRequestSheetBodyState extends State<_AdoptionRequestSheetBody> {
  final _repository = GarcaPetRepository();
  final _messageCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _messageCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _repository.requestAdoption(
        petId: widget.pet.id,
        message: _messageCtrl.text,
      );
      if (!mounted) return;
      Navigator.pop(context, true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text((data['message'] ?? 'Solicitação enviada!').toString()),
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
        _error = 'Não foi possível enviar a solicitação.';
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
              'Adotar ${widget.pet.name}',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Escreva uma mensagem para o responsável. A fila e elegibilidade são validadas pelo servidor.',
              style: TextStyle(fontSize: 13, height: 1.35),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _messageCtrl,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Mensagem inicial *',
                border: OutlineInputBorder(),
              ),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Mensagem obrigatória.' : null,
            ),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(_error!, style: const TextStyle(color: GarcaPetColors.error)),
            ],
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _loading ? null : _submit,
              style: FilledButton.styleFrom(
                backgroundColor: GarcaPetColors.primary,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: _loading
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Enviar solicitação'),
            ),
          ],
        ),
      ),
    );
  }
}
