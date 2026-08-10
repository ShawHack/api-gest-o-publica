import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:prefeitura_app/features/garca_pet/data/garca_pet_exception.dart';
import 'package:prefeitura_app/features/garca_pet/domain/models/pet_form_options.dart';
import 'package:prefeitura_app/features/garca_pet/domain/repositories/garca_pet_repository.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/theme/garca_pet_colors.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/garca_pet_error_handler.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/garca_pet_media_permissions.dart';
import 'package:prefeitura_app/features/garca_pet/presentation/widgets/pet_network_image.dart';

class PetFormPage extends StatefulWidget {
  const PetFormPage({
    super.key,
    this.petId,
    this.onSaved,
  });

  /// Se null → cadastro (doação). Se preenchido → edição.
  final String? petId;
  final VoidCallback? onSaved;

  @override
  State<PetFormPage> createState() => PetFormPageState();
}

class PetFormPageState extends State<PetFormPage> {
  final _formKey = GlobalKey<FormState>();
  final _repository = GarcaPetRepository();
  final _picker = ImagePicker();

  final _nameCtrl = TextEditingController();
  final _ageCtrl = TextEditingController();
  final _weightCtrl = TextEditingController();
  final _colorCtrl = TextEditingController();
  final _breedCtrl = TextEditingController();
  final _chipCtrl = TextEditingController();

  String? _type;
  String? _size;
  String? _gender;
  final List<XFile> _newImages = [];
  List<String> _existingImageUrls = [];

  bool _loading = false;
  bool _loadingPet = false;
  String? _loadError;

  bool get _isEdit => widget.petId != null && widget.petId!.isNotEmpty;

  @override
  void initState() {
    super.initState();
    if (_isEdit) _loadPetForEdit();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _ageCtrl.dispose();
    _weightCtrl.dispose();
    _colorCtrl.dispose();
    _breedCtrl.dispose();
    _chipCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadPetForEdit() async {
    setState(() {
      _loadingPet = true;
      _loadError = null;
    });
    try {
      final pet = await _repository.getPetById(widget.petId!);
      if (!mounted) return;
      _nameCtrl.text = pet.name;
      _ageCtrl.text = pet.age;
      _weightCtrl.text = pet.weight.toString();
      _colorCtrl.text = pet.color;
      _breedCtrl.text = pet.breed;
      setState(() {
        _type = pet.type;
        _size = pet.size;
        _gender = pet.gender;
        _existingImageUrls = pet.imageUrls;
        _loadingPet = false;
      });
    } on GarcaPetException catch (e) {
      if (!mounted) return;
      setState(() {
        _loadError = e.message;
        _loadingPet = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loadError = 'Erro ao carregar pet.';
        _loadingPet = false;
      });
    }
  }

  Future<void> _pickImages() async {
    final allowed = await GarcaPetMediaPermissions.ensureGalleryAccess(context);
    if (!allowed || !mounted) return;

    final picked = await _picker.pickMultiImage(imageQuality: 85);
    if (picked.isEmpty || !mounted) return;
    setState(() {
      _newImages.addAll(picked);
    });
  }

  void _removeNewImage(int index) {
    setState(() => _newImages.removeAt(index));
  }

  Map<String, String> _buildFields() {
    return {
      'name': _nameCtrl.text.trim(),
      'age': _ageCtrl.text.trim(),
      'weight': _weightCtrl.text.trim().replaceAll(',', '.'),
      'color': _colorCtrl.text.trim(),
      'breed': _breedCtrl.text.trim(),
      'type': _type!,
      'size': _size!,
      'gender': _gender!,
      if (_chipCtrl.text.trim().isNotEmpty) 'chip': _chipCtrl.text.trim(),
    };
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_type == null || _size == null || _gender == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecione tipo, porte e sexo.')),
      );
      return;
    }
    if (!_isEdit && _newImages.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Adicione pelo menos uma foto.')),
      );
      return;
    }

    setState(() => _loading = true);
    try {
      final fields = _buildFields();
      if (_isEdit) {
        await _repository.updatePet(
          petId: widget.petId!,
          fields: fields,
          images: _newImages,
        );
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Pet atualizado com sucesso!'),
            backgroundColor: GarcaPetColors.primary,
          ),
        );
      } else {
        await _repository.createPet(fields: fields, images: _newImages);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Pet cadastrado com sucesso!'),
            backgroundColor: GarcaPetColors.primary,
          ),
        );
        _resetForm();
      }
      widget.onSaved?.call();
    } on GarcaPetException catch (e) {
      if (!mounted) return;
      if (!await GarcaPetErrorHandler.handle(context, e)) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message), backgroundColor: GarcaPetColors.error),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro: $e')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _resetForm() {
    _formKey.currentState?.reset();
    _nameCtrl.clear();
    _ageCtrl.clear();
    _weightCtrl.clear();
    _colorCtrl.clear();
    _breedCtrl.clear();
    _chipCtrl.clear();
    setState(() {
      _type = null;
      _size = null;
      _gender = null;
      _newImages.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loadingPet) {
      return const Center(child: CircularProgressIndicator(color: GarcaPetColors.primary));
    }
    if (_loadError != null) {
      return Center(child: Text(_loadError!, textAlign: TextAlign.center));
    }

    final form = Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            _isEdit ? 'Editar pet' : 'Cadastrar pet para adoção',
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          Text(
            'Campos obrigatórios conforme a plataforma Garça Pet. Regras finais validadas pelo servidor.',
            style: TextStyle(fontSize: 12, color: Colors.grey.shade700, height: 1.3),
          ),
          const SizedBox(height: 16),
          _sectionTitle('Fotos'),
          _buildPhotosSection(),
          const SizedBox(height: 16),
          _sectionTitle('Identificação'),
          TextFormField(
            controller: _nameCtrl,
            decoration: const InputDecoration(labelText: 'Nome *', border: OutlineInputBorder()),
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Obrigatório' : null,
          ),
          const SizedBox(height: 12),
          _dropdown(
            label: 'Tipo *',
            value: _type,
            items: PetFormOptions.types,
            onChanged: (v) => setState(() => _type = v),
          ),
          const SizedBox(height: 12),
          _dropdown(
            label: 'Porte *',
            value: _size,
            items: PetFormOptions.sizes,
            onChanged: (v) => setState(() => _size = v),
          ),
          const SizedBox(height: 12),
          _dropdown(
            label: 'Sexo *',
            value: _gender,
            items: PetFormOptions.genders,
            onChanged: (v) => setState(() => _gender = v),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _ageCtrl,
            decoration: const InputDecoration(
              labelText: 'Idade *',
              hintText: 'Ex.: 2 anos, filhote',
              border: OutlineInputBorder(),
            ),
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Obrigatório' : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _breedCtrl,
            decoration: const InputDecoration(labelText: 'Raça *', border: OutlineInputBorder()),
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Obrigatório' : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _colorCtrl,
            decoration: const InputDecoration(labelText: 'Cor *', border: OutlineInputBorder()),
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Obrigatório' : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _weightCtrl,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(
              labelText: 'Peso (kg) *',
              border: OutlineInputBorder(),
            ),
            validator: (v) {
              if (v == null || v.trim().isEmpty) return 'Obrigatório';
              final n = double.tryParse(v.replaceAll(',', '.'));
              if (n == null || n <= 0) return 'Informe um peso válido';
              return null;
            },
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _chipCtrl,
            decoration: const InputDecoration(
              labelText: 'Chip (opcional)',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 24),
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
                : Text(_isEdit ? 'Salvar alterações' : 'Cadastrar pet'),
          ),
        ],
      ),
    );

    if (_isEdit && Navigator.canPop(context)) {
      return Scaffold(
        appBar: AppBar(
          backgroundColor: GarcaPetColors.primary,
          foregroundColor: Colors.white,
          title: const Text('Editar pet'),
        ),
        body: form,
      );
    }

    return form;
  }

  Widget _sectionTitle(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: const TextStyle(fontWeight: FontWeight.w600, color: GarcaPetColors.primary),
      ),
    );
  }

  Widget _dropdown({
    required String label,
    required String? value,
    required List<String> items,
    required ValueChanged<String?> onChanged,
  }) {
    return DropdownButtonFormField<String>(
      value: value,
      decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
      items: items.map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
      onChanged: onChanged,
      validator: (v) => v == null ? 'Selecione' : null,
    );
  }

  Widget _buildPhotosSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_existingImageUrls.isNotEmpty) ...[
          SizedBox(
            height: 88,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _existingImageUrls.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) => PetNetworkImage(
                url: _existingImageUrls[i],
                width: 88,
                height: 88,
                borderRadius: BorderRadius.circular(8),
                placeholderIconSize: 28,
              ),
            ),
          ),
          if (_isEdit)
            Padding(
              padding: const EdgeInsets.only(top: 6, bottom: 8),
              child: Text(
                'Fotos atuais. Envie novas abaixo para substituir a galeria.',
                style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
              ),
            ),
        ],
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (var i = 0; i < _newImages.length; i += 1)
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.file(
                      File(_newImages[i].path),
                      width: 88,
                      height: 88,
                      fit: BoxFit.cover,
                    ),
                  ),
                  Positioned(
                    top: 0,
                    right: 0,
                    child: IconButton(
                      style: IconButton.styleFrom(
                        backgroundColor: Colors.black54,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.all(4),
                        minimumSize: const Size(28, 28),
                      ),
                      icon: const Icon(Icons.close, size: 16),
                      onPressed: () => _removeNewImage(i),
                    ),
                  ),
                ],
              ),
            OutlinedButton.icon(
              onPressed: _pickImages,
              icon: const Icon(Icons.add_a_photo_outlined),
              label: const Text('Adicionar fotos'),
              style: OutlinedButton.styleFrom(
                foregroundColor: GarcaPetColors.primary,
                side: const BorderSide(color: GarcaPetColors.primary),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
