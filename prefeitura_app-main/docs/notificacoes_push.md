# Sistema de Notificações Push - Prefeitura App

## Visão Geral

O sistema de notificações push foi implementado para permitir que mensagens sejam enviadas de um ambiente externo ao app e sejam recebidas pelos usuários baseado em suas configurações de preferência.

## Funcionalidades Implementadas

### 1. Serviço de Notificações (`NotificationService`)
- Gerenciamento de notificações push via Firebase Cloud Messaging
- Armazenamento local de configurações do usuário
- Categorização de notificações (geral, serviços, secretarias, emergências, eventos)
- Controle de permissões de notificação

### 2. Interface do Usuário
- **Ícone de sino no drawer**: Mostra contador de notificações não lidas
- **Tela de notificações**: Lista todas as notificações recebidas com filtros
- **Tela de configurações**: Permite ao usuário escolher quais tipos de notificação receber

### 3. Categorias de Notificação
- **Geral**: Avisos e informações gerais da prefeitura
- **Serviços**: Atualizações sobre serviços municipais
- **Secretarias**: Comunicados das secretarias municipais
- **Emergências**: Alertas de emergência e situações críticas
- **Eventos**: Informações sobre eventos e atividades

## Como Enviar Notificações do Sistema Externo

### 1. Obter Token FCM do Usuário

O app salva o token FCM do usuário no SharedPreferences. Para obter o token:

```dart
final notificationService = NotificationService();
await notificationService.initialize();
String? token = await notificationService.getFCMToken();
```

### 2. Enviar Notificação via Firebase Admin SDK

#### Node.js (Exemplo)
```javascript
const admin = require('firebase-admin');

// Inicializar Firebase Admin
const serviceAccount = require('./path/to/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Enviar notificação
async function sendNotification(token, title, body, category = 'geral') {
  const message = {
    token: token,
    notification: {
      title: title,
      body: body,
    },
    data: {
      category: category,
      timestamp: new Date().toISOString(),
    },
    android: {
      notification: {
        channelId: 'prefeitura_channel',
        priority: 'high',
        sound: 'default',
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Notificação enviada:', response);
    return response;
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    throw error;
  }
}

// Exemplo de uso
sendNotification(
  'token_do_usuario_aqui',
  'Nova notificação',
  'Esta é uma notificação de teste',
  'geral'
);
```

#### Python (Exemplo)
```python
from firebase_admin import credentials, messaging
import firebase_admin

# Inicializar Firebase Admin
cred = credentials.Certificate('path/to/serviceAccountKey.json')
firebase_admin.initialize_app(cred)

def send_notification(token, title, body, category='geral'):
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data={
            'category': category,
            'timestamp': str(int(time.time())),
        },
        token=token,
        android=messaging.AndroidConfig(
            notification=messaging.AndroidNotification(
                channel_id='prefeitura_channel',
                priority='high',
                sound='default',
            ),
        ),
    )
    
    try:
        response = messaging.send(message)
        print(f'Notificação enviada: {response}')
        return response
    except Exception as e:
        print(f'Erro ao enviar notificação: {e}')
        raise

# Exemplo de uso
send_notification(
    'token_do_usuario_aqui',
    'Nova notificação',
    'Esta é uma notificação de teste',
    'geral'
)
```

### 3. Verificar Configurações do Usuário

Antes de enviar uma notificação, o sistema externo deve verificar se o usuário tem habilitado o tipo de notificação. Isso pode ser feito de duas formas:

#### Opção 1: Verificação no App (Recomendado)
O app verifica as configurações localmente antes de exibir a notificação.

#### Opção 2: Verificação no Servidor
Armazenar as configurações do usuário no servidor e verificar antes de enviar.

### 4. Estrutura da Mensagem

```json
{
  "token": "fcm_token_do_usuario",
  "notification": {
    "title": "Título da notificação",
    "body": "Corpo da notificação"
  },
  "data": {
    "category": "geral|servicos|secretarias|emergencias|eventos",
    "timestamp": "2024-01-01T00:00:00Z",
    "action": "opcional_acao_especifica",
    "url": "opcional_url_para_abrir"
  },
  "android": {
    "notification": {
      "channelId": "prefeitura_channel",
      "priority": "high",
      "sound": "default"
    }
  }
}
```

## Configuração do Firebase

### 1. Arquivo de Configuração
O arquivo `google-services.json` já está configurado no projeto.

### 2. Chave do Servidor
Para enviar notificações do servidor, você precisa da chave do servidor Firebase:

1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Selecione o projeto "prefeituraapp"
3. Vá em "Configurações do projeto" > "Contas de serviço"
4. Clique em "Gerar nova chave privada"
5. Baixe o arquivo JSON da chave

### 3. Permissões Necessárias
- `cloudmessaging.messages.create`
- `firebase.projects.get`

## Testando o Sistema

### 1. Teste Local
```dart
// No app, você pode testar criando uma notificação local
final notificationService = NotificationService();
await notificationService.initialize();

// Simular notificação
await notificationService._addNotificationToList(
  RemoteMessage(
    messageId: 'test_${DateTime.now().millisecondsSinceEpoch}',
    notification: RemoteNotification(
      title: 'Teste',
      body: 'Notificação de teste',
    ),
    data: {'category': 'geral'},
  ),
);
```

### 2. Teste via Firebase Console
1. Acesse o Console do Firebase
2. Vá em "Engajamento" > "Mensagens"
3. Clique em "Criar sua primeira campanha"
4. Selecione "Notificação"
5. Configure a mensagem e envie para um token específico

## Monitoramento e Logs

### 1. Logs do App
O app gera logs para:
- Token FCM obtido
- Notificações recebidas
- Configurações alteradas
- Erros de permissão

### 2. Métricas do Firebase
- Taxa de entrega
- Taxa de abertura
- Dispositivos ativos
- Erros de envio

## Considerações de Segurança

1. **Tokens FCM**: São únicos por dispositivo e app, mas podem mudar
2. **Dados sensíveis**: Não incluir informações sensíveis no campo `data`
3. **Validação**: Sempre validar dados antes de enviar
4. **Rate Limiting**: Implementar controle de taxa para evitar spam

## Troubleshooting

### Problemas Comuns

1. **Notificações não chegam**:
   - Verificar se as permissões estão concedidas
   - Verificar se o token FCM é válido
   - Verificar configurações de notificação do usuário

2. **Token FCM inválido**:
   - Tokens podem expirar ou mudar
   - Implementar renovação automática de tokens

3. **Notificações não aparecem em background**:
   - Verificar configuração do AndroidManifest.xml
   - Verificar se o serviço de background está configurado

### Logs Úteis
```bash
# Android
adb logcat | grep -E "(Firebase|Notification|FCM)"

# Flutter
flutter logs
```

