import 'package:image_picker/image_picker.dart';
import 'package:prefeitura_app/features/garca_pet/data/garca_pet_api.dart';
import 'package:prefeitura_app/features/garca_pet/domain/models/adoption_chat_model.dart';
import 'package:prefeitura_app/features/garca_pet/domain/models/adoption_request_model.dart';
import 'package:prefeitura_app/features/garca_pet/domain/models/pet_model.dart';

class GarcaPetRepository {
  GarcaPetRepository({GarcaPetApi? api}) : _api = api ?? GarcaPetApi();

  final GarcaPetApi _api;

  Future<List<PetModel>> getAvailablePets() => _api.fetchAvailablePets();

  Future<PetModel> getPetById(String id) => _api.fetchPetById(id);

  Future<List<PetModel>> getMyPets() => _api.fetchMyPets();

  Future<PetModel> createPet({
    required Map<String, String> fields,
    required List<XFile> images,
  }) =>
      _api.createPet(fields: fields, imageFiles: images);

  Future<void> updatePet({
    required String petId,
    required Map<String, String> fields,
    List<XFile> images = const [],
  }) =>
      _api.updatePet(petId: petId, fields: fields, imageFiles: images);

  Future<void> deletePet(String petId) => _api.deletePet(petId);

  Future<Map<String, dynamic>> requestAdoption({
    required String petId,
    required String message,
  }) =>
      _api.createAdoptionRequest(petId: petId, message: message);

  Future<List<AdoptionRequestModel>> getAdoptionQueue(String petId) =>
      _api.fetchAdoptionQueue(petId);

  Future<List<PetModel>> getMyAdoptions() => _api.fetchMyAdoptions();

  Future<Map<String, dynamic>> updateAdoptionStatus({
    required String requestId,
    required String status,
    String message = '',
  }) =>
      _api.updateAdoptionStatus(
        requestId: requestId,
        status: status,
        message: message,
      );

  Future<Map<String, dynamic>> concludeAdoption({
    required String requestId,
    String message = '',
  }) =>
      _api.concludeAdoption(requestId: requestId, message: message);

  Future<Map<String, dynamic>> cancelMyAdoption(String requestId) =>
      _api.cancelMyAdoptionRequest(requestId);

  Future<Map<String, dynamic>> sendAdoptionMessage({
    required String requestId,
    required String message,
  }) =>
      _api.sendAdoptionMessage(requestId: requestId, message: message);

  Future<AdoptionChatSnapshot> getAdoptionChat(String requestId) =>
      _api.fetchAdoptionChat(requestId);

  Future<void> heartbeatAdoptionChat(String requestId) =>
      _api.postAdoptionPresence(requestId);

  Future<String?> findAdoptionRequestIdForPet(String petId) async {
    final pets = await getMyAdoptions();
    for (final pet in pets) {
      if (pet.id == petId &&
          pet.adoptionRequestId != null &&
          pet.adoptionRequestId!.isNotEmpty) {
        return pet.adoptionRequestId;
      }
    }
    return null;
  }

  Future<Map<String, dynamic>> reportPet({
    required String petId,
    required String reason,
    String description = '',
  }) =>
      _api.reportPet(petId: petId, reason: reason, description: description);
}
