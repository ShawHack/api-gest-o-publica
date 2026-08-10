import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../../models/service.dart';

/// Tela de gerenciamento de serviços (apenas para gerentes)
class ManageServicesScreen extends StatefulWidget {
  const ManageServicesScreen({super.key});

  @override
  State<ManageServicesScreen> createState() => _ManageServicesScreenState();
}

class _ManageServicesScreenState extends State<ManageServicesScreen> {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final String _apiUrl = 'https://api.garca.sp.gov.br/api';
  
  bool _loading = false;
  List<Service> _services = [];

  @override
  void initState() {
    super.initState();
    _loadServices();
  }

  /// Carrega todos os serviços
  Future<void> _loadServices() async {
    setState(() => _loading = true);
    try {
      final snapshot = await _firestore
          .collection('services')
          .orderBy('name')
          .get();

      setState(() {
        _services = snapshot.docs
            .map((doc) => Service.fromFirestore(doc))
            .toList();
      });
    } catch (e) {
      debugPrint('Erro ao carregar serviços: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao carregar serviços: $e')),
        );
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  /// Mostra dialog para adicionar/editar serviço
  Future<void> _showServiceDialog({Service? service}) async {
    final nameController = TextEditingController(text: service?.name ?? '');
    final formKey = GlobalKey<FormState>();

    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(service == null ? 'Adicionar Serviço' : 'Editar Serviço'),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Nome do Serviço',
                  hintText: 'Ex: Alvará de Funcionamento',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Digite o nome do serviço';
                  }
                  return null;
                },
                autofocus: true,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              if (formKey.currentState!.validate()) {
                Navigator.pop(context, true);
              }
            },
            child: Text(service == null ? 'Adicionar' : 'Salvar'),
          ),
        ],
      ),
    );

    if (result == true) {
      await _saveService(
        name: nameController.text.trim(),
        serviceId: service?.id,
        existingAttendants: service?.attendants ?? [],
      );
    }
  }

  /// Salva serviço no Firestore
  Future<void> _saveService({
    required String name,
    String? serviceId,
    List<String> existingAttendants = const [],
  }) async {
    setState(() => _loading = true);
    try {
      final now = DateTime.now();
      
      if (serviceId == null) {
        // Criar novo serviço
        await _firestore.collection('services').add({
          'name': name,
          'attendants': [],
          'createdAt': Timestamp.fromDate(now),
          'updatedAt': Timestamp.fromDate(now),
        });
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Serviço adicionado com sucesso!')),
          );
        }
      } else {
        // Atualizar serviço existente
        await _firestore.collection('services').doc(serviceId).update({
          'name': name,
          'updatedAt': Timestamp.fromDate(now),
        });
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Serviço atualizado com sucesso!')),
          );
        }
      }
      
      await _loadServices();
    } catch (e) {
      debugPrint('Erro ao salvar serviço: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao salvar serviço: $e')),
        );
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  /// Deleta serviço
  Future<void> _deleteService(Service service) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmar Exclusão'),
        content: Text('Deseja realmente excluir o serviço "${service.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Excluir'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _loading = true);
      try {
        await _firestore.collection('services').doc(service.id).delete();
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Serviço excluído com sucesso!')),
          );
        }
        
        await _loadServices();
      } catch (e) {
        debugPrint('Erro ao excluir serviço: $e');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erro ao excluir serviço: $e')),
          );
        }
      } finally {
        setState(() => _loading = false);
      }
    }
  }

  /// Mostra dialog para adicionar atendente ao serviço
  Future<void> _showAddAttendantDialog(Service service) async {
    final nameController = TextEditingController();
    final formKey = GlobalKey<FormState>();
    List<Map<String, String>> searchResults = [];
    Map<String, String>? selectedUser;
    bool searching = false;

    await showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text('Adicionar Atendente\n${service.name}'),
          content: SizedBox(
            width: 500,
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: nameController,
                    decoration: const InputDecoration(
                      labelText: 'Nome do Atendente',
                      hintText: 'Digite o nome completo',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.person),
                    ),
                    keyboardType: TextInputType.text,
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Digite o nome do atendente';
                      }
                      return null;
                    },
                    onChanged: (value) {
                      setDialogState(() {
                        searchResults = [];
                        selectedUser = null;
                      });
                    },
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: searching
                        ? null
                        : () async {
                            if (formKey.currentState!.validate()) {
                              setDialogState(() => searching = true);
                              final results = await _searchUsersByName(nameController.text.trim());
                              setDialogState(() {
                                searchResults = results;
                                selectedUser = null;
                                searching = false;
                              });
                            }
                          },
                    icon: searching
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.search),
                    label: Text(searching ? 'Buscando...' : 'Buscar Usuário'),
                  ),
                  if (searchResults.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    const Text(
                      'Selecione o usuário:',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      constraints: const BoxConstraints(maxHeight: 300),
                      child: ListView.builder(
                        shrinkWrap: true,
                        itemCount: searchResults.length,
                        itemBuilder: (context, index) {
                          final user = searchResults[index];
                          final isSelected = selectedUser?['id'] == user['id'];

                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            decoration: BoxDecoration(
                              color: isSelected ? Colors.green.shade50 : Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: isSelected ? Colors.green : Colors.grey.shade300,
                                width: isSelected ? 2 : 1,
                              ),
                            ),
                            child: ListTile(
                              leading: Icon(
                                isSelected ? Icons.check_circle : Icons.person,
                                color: isSelected ? Colors.green : Colors.grey,
                              ),
                              title: Text(
                                user['name']!,
                                style: TextStyle(
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                ),
                              ),
                              subtitle: Text(user['email']!),
                              onTap: () {
                                setDialogState(() => selectedUser = user);
                              },
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: selectedUser == null
                  ? null
                  : () {
                      Navigator.pop(context);
                      _addAttendantToService(service, selectedUser!['id']!);
                    },
              child: const Text('Adicionar'),
            ),
          ],
        ),
      ),
    );
  }

  /// Busca usuários por nome na API
  /// Retorna uma lista de Maps com {id, name, email}
  Future<List<Map<String, String>>> _searchUsersByName(String name) async {
    try {
      debugPrint('🔍 Buscando usuários com nome: $name');

      // Obtém o token de autenticação
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? prefs.getString('auth_token');

      if (token == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Sessão expirada. Faça login novamente.')),
          );
        }
        return [];
      }

      // A API usa o parâmetro 'q' para buscar por nome ou email
      final url = '$_apiUrl/users?q=$name';
      debugPrint('🌐 URL: $url');
      debugPrint('🔑 Token: ${token.substring(0, 20)}...');

      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      debugPrint('📥 Resposta: ${response.statusCode}');
      debugPrint('📦 Body (primeiros 500 chars): ${response.body.substring(0, response.body.length > 500 ? 500 : response.body.length)}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        if (data is Map && data.containsKey('users')) {
          final users = data['users'] as List;

          if (users.isEmpty) {
            debugPrint('⚠️ Nenhum usuário encontrado pela API');
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Nenhum usuário encontrado')),
              );
            }
            return [];
          }

          debugPrint('📊 Total de usuários retornados pela API: ${users.length}');

          // Converte para o formato esperado
          final results = users.map((user) {
            final userName = user['name'] as String;
            debugPrint('  - $userName');
            return {
              'id': user['_id'] as String,
              'name': userName,
              'email': user['email'] as String,
            };
          }).toList();

          debugPrint('✅ ${results.length} usuário(s) encontrado(s)');

          return results;
        }
      } else {
        debugPrint('❌ Status code: ${response.statusCode}');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Erro ao buscar usuário')),
          );
        }
        return [];
      }

      return [];
    } catch (e) {
      debugPrint('❌ Erro ao buscar usuário: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao buscar usuário: $e')),
        );
      }
      return [];
    }
  }

  /// Adiciona atendente ao serviço
  Future<void> _addAttendantToService(Service service, String userId) async {
    setState(() => _loading = true);
    try {
      // Verifica se o atendente já está no serviço
      if (service.attendants.contains(userId)) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Este atendente já está neste serviço')),
          );
        }
        setState(() => _loading = false);
        return;
      }

      await _firestore.collection('services').doc(service.id).update({
        'attendants': FieldValue.arrayUnion([userId]),
        'updatedAt': Timestamp.now(),
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Atendente adicionado com sucesso!')),
        );
      }

      await _loadServices();
    } catch (e) {
      debugPrint('Erro ao adicionar atendente: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao adicionar atendente: $e')),
        );
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gerenciar Serviços'),
        backgroundColor: const Color(0xFF384D9C), // RGB(56, 77, 156)
        foregroundColor: Colors.white,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _services.isEmpty
              ? _buildEmptyState()
              : _buildServicesList(),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showServiceDialog(),
        backgroundColor: const Color(0xFF384D9C), // RGB(56, 77, 156)
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text(
          'Adicionar Serviço',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.work_outline, size: 80, color: Colors.grey.shade400),
          const SizedBox(height: 16),
          Text(
            'Nenhum serviço cadastrado',
            style: TextStyle(fontSize: 18, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 8),
          Text(
            'Clique no botão abaixo para adicionar',
            style: TextStyle(color: Colors.grey.shade500),
          ),
        ],
      ),
    );
  }

  Widget _buildServicesList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _services.length,
      itemBuilder: (context, index) {
        final service = _services[index];
        return _buildServiceCard(service);
      },
    );
  }

  Widget _buildServiceCard(Service service) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      child: ExpansionTile(
        leading: const Icon(Icons.work, color: Color(0xFF384D9C)), // RGB(56, 77, 156)
        title: Text(
          service.name,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        subtitle: Text(
          '${service.attendants.length} atendente(s)',
          style: TextStyle(color: Colors.grey.shade600),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.edit, color: Color(0xFF384D9C)), // RGB(56, 77, 156)
              onPressed: () => _showServiceDialog(service: service),
              tooltip: 'Editar',
            ),
            IconButton(
              icon: const Icon(Icons.delete, color: Colors.red),
              onPressed: () => _deleteService(service),
              tooltip: 'Excluir',
            ),
          ],
        ),
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Atendentes:',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    ElevatedButton.icon(
                      onPressed: () => _showAddAttendantDialog(service),
                      icon: const Icon(Icons.person_add, size: 18),
                      label: const Text('Adicionar'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF384D9C), // RGB(56, 77, 156)
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (service.attendants.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.info_outline, color: Colors.grey.shade600),
                        const SizedBox(width: 8),
                        Text(
                          'Nenhum atendente cadastrado',
                          style: TextStyle(color: Colors.grey.shade600),
                        ),
                      ],
                    ),
                  )
                else
                  ...service.attendants.map((cpf) {
                    return _buildAttendantItem(service, cpf);
                  }),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAttendantItem(Service service, String userId) {
    return FutureBuilder<Map<String, String>?>(
      future: _getUserById(userId),
      builder: (context, snapshot) {
        String displayText = 'Carregando...';

        if (snapshot.connectionState == ConnectionState.done) {
          if (snapshot.hasData && snapshot.data != null) {
            displayText = '${snapshot.data!['name']}\n${snapshot.data!['email']}';
          } else {
            displayText = 'ID: $userId';
          }
        }

        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF384D9C).withOpacity(0.1), // RGB(56, 77, 156)
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: const Color(0xFF384D9C).withOpacity(0.3)), // RGB(56, 77, 156)
          ),
          child: Row(
            children: [
              const Icon(Icons.person, color: Color(0xFF384D9C), size: 20), // RGB(56, 77, 156)
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  displayText,
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.remove_circle, color: Colors.red, size: 20),
                onPressed: () => _removeAttendantFromService(service, userId),
                tooltip: 'Remover',
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
        );
      },
    );
  }

  /// Busca usuário por ID na API
  Future<Map<String, String>?> _getUserById(String userId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? prefs.getString('auth_token');

      if (token == null) return null;

      final response = await http.get(
        Uri.parse('$_apiUrl/users/$userId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        // A API pode retornar {user: {...}} ou {...} diretamente
        final user = data is Map && data.containsKey('user') ? data['user'] : data;

        return {
          'id': user['_id'] ?? userId,
          'name': user['name'] ?? 'Nome não disponível',
          'email': user['email'] ?? '',
        };
      }

      return null;
    } catch (e) {
      debugPrint('❌ Erro ao buscar usuário por ID: $e');
      return null;
    }
  }

  /// Remove atendente do serviço
  Future<void> _removeAttendantFromService(Service service, String userId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmar Remoção'),
        content: const Text('Deseja remover este atendente do serviço?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Remover'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _loading = true);
      try {
        await _firestore.collection('services').doc(service.id).update({
          'attendants': FieldValue.arrayRemove([userId]),
          'updatedAt': Timestamp.now(),
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Atendente removido com sucesso!')),
          );
        }

        await _loadServices();
      } catch (e) {
        debugPrint('Erro ao remover atendente: $e');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erro ao remover atendente: $e')),
          );
        }
      } finally {
        setState(() => _loading = false);
      }
    }
  }
}

