import React, { useState } from 'react';
import { Container, Card, TextInput, PasswordInput, Button, Title, Stack, Text, Group } from '@mantine/core';
import { IconAt, IconLock } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

function LoginScreen({ onLogin }) {
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [loading, setLoading] = useState(false);

const handleLogin = () => {
if (!email || !password) {
notifications.show({ title: 'Fel', message: 'Fyll i både e-post och lösenord', color: 'red' });
return;
}
setLoading(true);
// Simulate login
setTimeout(() => {
setLoading(false);
onLogin(email, password);
}, 1000);
};

return (
<Container
fluid
style={{
minHeight: '100vh',
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
background: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
}}
>
<Card shadow="xl" padding="xl" radius="md" style={{ width: 360 }}> <Stack spacing="lg"> <Title order={2} align="center">Välkommen</Title> <Text align="center" color="dimmed">Logga in för att hantera önskelistan</Text>

```
      <TextInput
        placeholder="E-post"
        label="E-post"
        icon={<IconAt size={16} />}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <PasswordInput
        placeholder="Lösenord"
        label="Lösenord"
        icon={<IconLock size={16} />}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <Button fullWidth onClick={handleLogin} loading={loading} radius="xl">
        Logga in
      </Button>

    </Stack>
  </Card>
</Container>


);
}

export default LoginScreen;
