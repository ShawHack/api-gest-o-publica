import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:prefeitura_app/features/garca_pet/data/garca_pet_exception.dart';
import 'package:prefeitura_app/features/garca_pet/domain/models/adoption_chat_model.dart';
import 'package:prefeitura_app/features/garca_pet/domain/repositories/garca_pet_repository.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/theme/garca_pet_colors.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/adoption_status_chip.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/garca_pet_error_handler.dart';

class AdoptionChatPage extends StatefulWidget {
  const AdoptionChatPage({
    super.key,
    required this.requestId,
    this.petName,
    this.viewerRoleHint,
  });

  final String requestId;
  final String? petName;
  final String? viewerRoleHint;

  @override
  State<AdoptionChatPage> createState() => _AdoptionChatPageState();
}

class _AdoptionChatPageState extends State<AdoptionChatPage> {
  static const _pollInterval = Duration(seconds: 8);
  static const _heartbeatInterval = Duration(seconds: 20);

  final _repository = GarcaPetRepository();
  final _messageCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();

  AdoptionChatSnapshot? _chat;
  bool _loading = true;
  bool _sending = false;
  String? _error;
  Timer? _pollTimer;
  Timer? _heartbeatTimer;

  @override
  void initState() {
    super.initState();
    _load(initial: true);
    _pollTimer = Timer.periodic(_pollInterval, (_) => _load());
    _heartbeatTimer = Timer.periodic(_heartbeatInterval, (_) {
      _repository.heartbeatAdoptionChat(widget.requestId).catchError((_) {});
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _heartbeatTimer?.cancel();
    _messageCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _load({bool initial = false}) async {
    if (initial) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final chat = await _repository.getAdoptionChat(widget.requestId);
      if (!mounted) return;
      final wasAtBottom = _isNearBottom();
      setState(() {
        _chat = chat;
        _loading = false;
        _error = null;
      });
      if (wasAtBottom || initial) {
        WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());
      }
    } on GarcaPetException catch (e) {
      if (!mounted) return;
      if (initial) {
        setState(() {
          _error = e.message;
          _loading = false;
        });
      }
      if (initial && await GarcaPetErrorHandler.handle(context, e)) return;
    } catch (_) {
      if (!mounted || !initial) return;
      setState(() {
        _error = 'Falha ao carregar conversa.';
        _loading = false;
      });
    }
  }

  bool _isNearBottom() {
    if (!_scrollCtrl.hasClients) return true;
    final max = _scrollCtrl.position.maxScrollExtent;
    return max - _scrollCtrl.offset < 80;
  }

  void _scrollToBottom() {
    if (!_scrollCtrl.hasClients) return;
    _scrollCtrl.animateTo(
      _scrollCtrl.position.maxScrollExtent,
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOut,
    );
  }

  Future<void> _send() async {
    final text = _messageCtrl.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await _repository.sendAdoptionMessage(requestId: widget.requestId, message: text);
      if (!mounted) return;
      _messageCtrl.clear();
      await _load();
    } on GarcaPetException catch (e) {
      if (!mounted) return;
      if (!await GarcaPetErrorHandler.handle(context, e)) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Não foi possível enviar a mensagem.')),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  String _presenceLabel(AdoptionChatSnapshot chat) {
    final other = chat.otherPresence;
    if (other.online) return '${chat.otherPartyName} está online';
    if (other.lastSeenAt == null) return '${chat.otherPartyName} — ainda não visualizou';
    return '${chat.otherPartyName} — visto ${_formatRelative(other.lastSeenAt!)}';
  }

  String _formatRelative(DateTime date) {
    final diff = DateTime.now().difference(date.toLocal());
    if (diff.inMinutes < 1) return 'agora há pouco';
    if (diff.inHours < 1) return 'há ${diff.inMinutes} min';
    if (diff.inDays < 1) return 'há ${diff.inHours} h';
    return DateFormat('dd/MM/yy HH:mm').format(date.toLocal());
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.petName ?? _chat?.petName ?? 'Conversa';

    return Scaffold(
      appBar: AppBar(
        backgroundColor: GarcaPetColors.primary,
        foregroundColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Chat de adoção', style: TextStyle(fontSize: 13)),
            Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading && _chat == null) {
      return const Center(child: CircularProgressIndicator(color: GarcaPetColors.primary));
    }
    if (_error != null && _chat == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () => _load(initial: true),
                style: FilledButton.styleFrom(backgroundColor: GarcaPetColors.primary),
                child: const Text('Tentar novamente'),
              ),
            ],
          ),
        ),
      );
    }

    final chat = _chat!;
    final messages = chat.visibleMessages;
    final viewerRole = chat.viewerRole.isNotEmpty ? chat.viewerRole : (widget.viewerRoleHint ?? '');

    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: GarcaPetColors.surface,
            border: Border(bottom: BorderSide(color: Colors.grey.shade300)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 6,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  AdoptionStatusChip(status: chat.status),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (chat.otherPresence.online)
                        Container(
                          width: 8,
                          height: 8,
                          margin: const EdgeInsets.only(right: 6),
                          decoration: const BoxDecoration(
                            color: Color(0xFF22C55E),
                            shape: BoxShape.circle,
                          ),
                        ),
                      Flexible(
                        child: Text(
                          _presenceLabel(chat),
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: messages.isEmpty
              ? const Center(
                  child: Text(
                    'Nenhuma mensagem ainda.\nEnvie a primeira!',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey),
                  ),
                )
              : ListView.builder(
                  controller: _scrollCtrl,
                  padding: const EdgeInsets.all(12),
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final msg = messages[index];
                    final mine = (viewerRole == 'donor' && msg.role == 'donor') ||
                        (viewerRole == 'adopter' && msg.role == 'adopter');
                    return Align(
                      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        constraints: BoxConstraints(
                          maxWidth: MediaQuery.sizeOf(context).width * 0.82,
                        ),
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: mine ? const Color(0xFFDBEAFE) : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              msg.role == 'donor'
                                  ? 'Responsável'
                                  : msg.role == 'adopter'
                                      ? 'Pretendente'
                                      : 'Sistema',
                              style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
                            ),
                            if (msg.createdAt != null)
                              Text(
                                _formatRelative(msg.createdAt!),
                                style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
                              ),
                            const SizedBox(height: 4),
                            Text(msg.message, style: const TextStyle(fontSize: 14, height: 1.35)),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageCtrl,
                    minLines: 1,
                    maxLines: 4,
                    enabled: !_sending,
                    decoration: const InputDecoration(
                      hintText: 'Digite sua mensagem…',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    onSubmitted: (_) => _send(),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: _sending ? null : _send,
                  style: FilledButton.styleFrom(backgroundColor: GarcaPetColors.primary),
                  child: _sending
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.send, size: 20),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

void openAdoptionChat(
  BuildContext context, {
  required String requestId,
  String? petName,
  String viewerRoleHint = 'donor',
}) {
  Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => AdoptionChatPage(
        requestId: requestId,
        petName: petName,
        viewerRoleHint: viewerRoleHint,
      ),
    ),
  );
}
