import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/garca_pet/data/garca_pet_exception.dart';
import 'package:prefeitura_app/features/garca_pet/domain/models/adoption_request_model.dart';
import 'package:prefeitura_app/features/garca_pet/domain/repositories/garca_pet_repository.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/pages/adoption_chat_page.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/theme/garca_pet_colors.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/adoption_status_chip.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/garca_pet_error_handler.dart';

typedef AdoptionQueueAction = Future<void> Function();

class AdoptionQueueItem extends StatefulWidget {
  const AdoptionQueueItem({
    super.key,
    required this.request,
    required this.onChanged,
  });

  final AdoptionRequestModel request;
  final VoidCallback onChanged;

  @override
  State<AdoptionQueueItem> createState() => _AdoptionQueueItemState();
}

class _AdoptionQueueItemState extends State<AdoptionQueueItem> {
  final _repository = GarcaPetRepository();
  final _messageCtrl = TextEditingController();
  bool _busy = false;

  AdoptionRequestModel get _req => widget.request;

  @override
  void dispose() {
    _messageCtrl.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await action();
      widget.onChanged();
    } on GarcaPetException catch (e) {
      if (!mounted) return;
      if (!await GarcaPetErrorHandler.handle(context, e)) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Não foi possível concluir a ação.')),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _patchStatus(String status) async {
    await _run(() async {
      final msg = _messageCtrl.text.trim();
      final data = await _repository.updateAdoptionStatus(
        requestId: _req.id,
        status: status,
        message: msg,
      );
      if (!mounted) return;
      _messageCtrl.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text((data['message'] ?? 'Status atualizado.').toString()),
          backgroundColor: GarcaPetColors.primary,
        ),
      );
    });
  }

  void _openChat() {
    openAdoptionChat(
      context,
      requestId: _req.id,
      viewerRoleHint: 'donor',
    );
  }

  Future<void> _conclude() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Concluir adoção?'),
        content: const Text(
          'O anúncio será encerrado e a adoção marcada como finalizada.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: GarcaPetColors.primary),
            child: const Text('Concluir'),
          ),
        ],
      ),
    );
    if (ok != true) return;

    await _run(() async {
      final data = await _repository.concludeAdoption(
        requestId: _req.id,
        message: _messageCtrl.text.trim(),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text((data['message'] ?? 'Adoção concluída.').toString()),
          backgroundColor: GarcaPetColors.primary,
        ),
      );
    });
  }

  Future<void> _removeFromQueue() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remover da fila?'),
        content: Text(
          'Remover ${_req.adopter?.name ?? 'este pretendente'} da fila de adoção?',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: GarcaPetColors.error),
            child: const Text('Remover'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await _patchStatus('cancelada_doador');
  }

  @override
  Widget build(BuildContext context) {
    final adopter = _req.adopter;
    final pos = _req.queuePosition;
    final total = _req.total;
    final isApproved = _req.status == 'aprovada';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: GarcaPetColors.accent.withValues(alpha: 0.4)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (pos != null && total != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Text(
                            '$posº de $total na fila',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: GarcaPetColors.primary,
                            ),
                          ),
                        ),
                      AdoptionStatusChip(status: _req.status),
                      const SizedBox(height: 8),
                      Text(
                        adopter?.name ?? 'Sem nome',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                      ),
                      if (adopter?.phone != null && adopter!.phone!.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text('Telefone: ${adopter.phone}', style: const TextStyle(fontSize: 13)),
                      ],
                      if (adopter?.email != null && adopter!.email!.isNotEmpty)
                        Text('E-mail: ${adopter.email}', style: const TextStyle(fontSize: 13)),
                    ],
                  ),
                ),
              ],
            ),
            if (_req.initialMessage != null && _req.initialMessage!.isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: GarcaPetColors.surface,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Mensagem inicial: ${_req.initialMessage}',
                  style: const TextStyle(fontSize: 13, height: 1.35),
                ),
              ),
            ],
            const SizedBox(height: 10),
            TextField(
              controller: _messageCtrl,
              maxLines: 2,
              enabled: !_busy,
              decoration: const InputDecoration(
                labelText: 'Recado (opcional)',
                hintText: 'Mensagem ao pretendente',
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: _busy ? null : _openChat,
              icon: const Icon(Icons.chat_bubble_outline, size: 18),
              label: const Text('Conversar'),
              style: OutlinedButton.styleFrom(
                foregroundColor: GarcaPetColors.primary,
                side: const BorderSide(color: GarcaPetColors.primary),
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _ActionButton(
                  label: 'Em análise',
                  color: const Color(0xFFFDBA74),
                  textColor: const Color(0xFF7C2D12),
                  disabled: _busy || _req.status == 'em_analise',
                  onPressed: () => _patchStatus('em_analise'),
                ),
                _ActionButton(
                  label: 'Aprovar',
                  color: const Color(0xFF86EFAC),
                  textColor: const Color(0xFF14532D),
                  disabled: _busy || isApproved,
                  onPressed: () => _patchStatus('aprovada'),
                ),
                _ActionButton(
                  label: 'Recusar',
                  color: const Color(0xFFFECACA),
                  textColor: const Color(0xFF991B1B),
                  disabled: _busy || isApproved || _req.status == 'concluida',
                  onPressed: () => _patchStatus('recusada'),
                ),
                if (isApproved)
                  _ActionButton(
                    label: 'Concluir adoção',
                    color: GarcaPetColors.primary,
                    textColor: Colors.white,
                    disabled: _busy,
                    onPressed: _conclude,
                  ),
                _ActionButton(
                  label: 'Remover da fila',
                  color: GarcaPetColors.error,
                  textColor: Colors.white,
                  disabled: _busy || isApproved || _req.status == 'concluida',
                  onPressed: _removeFromQueue,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.label,
    required this.color,
    required this.textColor,
    required this.onPressed,
    this.disabled = false,
  });

  final String label;
  final Color color;
  final Color textColor;
  final VoidCallback onPressed;
  final bool disabled;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: disabled ? null : onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: color,
        foregroundColor: textColor,
        disabledBackgroundColor: color.withValues(alpha: 0.45),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
      ),
      child: Text(label),
    );
  }
}
