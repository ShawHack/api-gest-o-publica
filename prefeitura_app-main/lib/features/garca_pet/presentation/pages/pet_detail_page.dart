import 'package:flutter/material.dart';
import 'package:prefeitura_app/features/garca_pet/data/garca_pet_exception.dart';
import 'package:prefeitura_app/features/garca_pet/domain/models/pet_model.dart';
import 'package:prefeitura_app/features/garca_pet/domain/repositories/garca_pet_repository.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/pages/adoption_chat_page.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/pages/pet_adoption_queue_page.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/theme/garca_pet_colors.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/adoption_block_banner.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/adoption_request_sheet.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/adoption_status_chip.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/approved_adoption_adopter_banner.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/garca_pet_error_handler.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/pet_image_gallery.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/pet_report_sheet.dart';

class PetDetailPage extends StatefulWidget {
  const PetDetailPage({super.key, required this.petId});

  final String petId;

  @override
  State<PetDetailPage> createState() => _PetDetailPageState();
}

class _PetDetailPageState extends State<PetDetailPage> {
  final _repository = GarcaPetRepository();
  PetModel? _pet;
  bool _loading = true;
  bool _openingChat = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final pet = await _repository.getPetById(widget.petId);
      if (!mounted) return;
      setState(() {
        _pet = pet;
        _loading = false;
      });
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
        _error = 'Não foi possível carregar o pet.';
        _loading = false;
      });
    }
  }

  bool _canOpenChat(PetModel pet) {
    if (pet.isOwnPet) return false;
    final status = pet.adopterStatus?.toLowerCase() ?? '';
    if (status.contains('finalizado') || status.contains('recusado')) return false;
    if (status.contains('cancelado')) return false;
    return pet.hasActiveRequestForMe || pet.adoptionRequestId != null;
  }

  Future<void> _openChat(PetModel pet) async {
    if (_openingChat) return;
    setState(() => _openingChat = true);
    try {
      var requestId = pet.adoptionRequestId;
      requestId ??= await _repository.findAdoptionRequestIdForPet(pet.id);
      if (!mounted) return;
      if (requestId == null || requestId.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Solicitação não encontrada. Veja em Minhas Adoções.')),
        );
        return;
      }
      openAdoptionChat(
        context,
        requestId: requestId,
        petName: pet.name,
        viewerRoleHint: 'adopter',
      );
    } on GarcaPetException catch (e) {
      if (!mounted) return;
      if (!await GarcaPetErrorHandler.handle(context, e)) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _openingChat = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: GarcaPetColors.primary,
        foregroundColor: Colors.white,
        title: Text(_pet?.name ?? 'Detalhe'),
        actions: [
          if (_pet != null && !_pet!.isOwnPet)
            IconButton(
              tooltip: 'Denunciar anúncio',
              icon: const Icon(Icons.flag_outlined),
              onPressed: () => showPetReportSheet(context, pet: _pet!),
            ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: GarcaPetColors.primary),
      );
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: _load,
                style: FilledButton.styleFrom(backgroundColor: GarcaPetColors.primary),
                child: const Text('Tentar novamente'),
              ),
            ],
          ),
        ),
      );
    }

    final pet = _pet!;
    final imageUrls = pet.imageUrls;

    return RefreshIndicator(
      color: GarcaPetColors.primary,
      onRefresh: _load,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            GestureDetector(
              onTap: imageUrls.isNotEmpty
                  ? () => openPetImageFullscreen(context, imageUrls)
                  : null,
              child: PetImageGallery(imageUrls: imageUrls),
            ),
            if (imageUrls.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  imageUrls.length > 1
                      ? 'Deslize para ver ${imageUrls.length} fotos · toque para ampliar'
                      : 'Toque para ampliar',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                ),
              ),
            const SizedBox(height: 16),
            Text(
              pet.name,
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            _infoRow('Tipo', pet.type),
            _infoRow('Porte', pet.size),
            _infoRow('Idade', pet.age),
            _infoRow('Sexo', pet.gender),
            _infoRow('Raça', pet.breed),
            _infoRow('Cor', pet.color),
            _infoRow('Peso', '${pet.weight.toStringAsFixed(1)} kg'),
            if (pet.applicantsCount > 0)
              _infoRow('Fila', '${pet.applicantsCount} pretendente(s)'),
            const SizedBox(height: 16),
            if (pet.isApprovedForAdoption && !pet.isOwnPet) ...[
              ApprovedAdoptionAdopterBanner(
                pet: pet,
                onContact: _canOpenChat(pet) && !_openingChat
                    ? () => _openChat(pet)
                    : null,
              ),
              const SizedBox(height: 12),
            ],
            AdoptionBlockBanner(pet: pet),
            if (!pet.isApprovedForAdoption &&
                pet.hasActiveRequestForMe &&
                (pet.adopterStatus != null || pet.myQueuePosition != null)) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  if (pet.adopterStatus != null)
                    AdoptionStatusChip(
                      status: 'enviada',
                      label: pet.adopterStatus,
                    ),
                  if (pet.myQueuePosition != null && pet.myQueueTotal != null)
                    Text(
                      'Sua posição: ${pet.myQueuePosition}º de ${pet.myQueueTotal}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        color: GarcaPetColors.primary,
                      ),
                    ),
                ],
              ),
            ],
            const SizedBox(height: 12),
            if (pet.isOwnPet && pet.applicantsCount > 0)
              OutlinedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => PetAdoptionQueuePage(
                        petId: pet.id,
                        petName: pet.name,
                      ),
                    ),
                  ).then((_) {
                    if (mounted) _load();
                  });
                },
                icon: const Icon(Icons.people_outline),
                label: Text('Gerenciar fila (${pet.applicantsCount})'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: GarcaPetColors.primary,
                  side: const BorderSide(color: GarcaPetColors.primary),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            if (pet.isOwnPet && pet.applicantsCount > 0) const SizedBox(height: 8),
            if (_canOpenChat(pet)) ...[
              if (pet.isApprovedForAdoption && !pet.isOwnPet)
                FilledButton.icon(
                  onPressed: _openingChat ? null : () => _openChat(pet),
                  icon: _openingChat
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.chat_bubble_outline),
                  label: const Text('Entrar em contato com o doador'),
                  style: FilledButton.styleFrom(
                    backgroundColor: GarcaPetColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                )
              else
                OutlinedButton.icon(
                  onPressed: _openingChat ? null : () => _openChat(pet),
                  icon: _openingChat
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.chat_bubble_outline),
                  label: const Text('Conversar com responsável'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: GarcaPetColors.primary,
                    side: const BorderSide(color: GarcaPetColors.primary),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              const SizedBox(height: 8),
            ],
            if (pet.canRequestAdoption == true)
              FilledButton(
                onPressed: () async {
                  final sent = await showAdoptionRequestSheet(context, pet: pet);
                  if (sent == true && mounted) _load();
                },
                style: FilledButton.styleFrom(
                  backgroundColor: GarcaPetColors.primary,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: const Text('Quero adotar'),
              ),
            if (!pet.isOwnPet) ...[
              const SizedBox(height: 16),
              TextButton.icon(
                onPressed: () => showPetReportSheet(context, pet: pet),
                icon: Icon(Icons.flag_outlined, size: 18, color: Colors.grey.shade700),
                label: Text(
                  'Denunciar anúncio',
                  style: TextStyle(color: Colors.grey.shade700),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 72,
            child: Text(
              label,
              style: TextStyle(color: Colors.grey.shade700, fontWeight: FontWeight.w600),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}
