import {
Container, Title, Card, Image, Text, Button, Group, Badge, Stack, TextInput, Modal, Transition
} from '@mantine/core';
import { IconGift, IconCheck, IconX, IconSettings } from '@tabler/icons-react';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import Confetti from 'react-confetti';

function WishlistView({ products, loading, onClaimProduct, onUnclaimProduct, onGoToAdmin, getImageUrl }) {
const [claimModalOpen, setClaimModalOpen] = useState(false);
const [selectedProduct, setSelectedProduct] = useState(null);
const [claimerName, setClaimerName] = useState('');
const [showConfetti, setShowConfetti] = useState(false);

const handleClaimClick = (product) => {
setSelectedProduct(product);
setClaimModalOpen(true);
};

const handleClaimSubmit = () => {
if (claimerName.trim()) {
onClaimProduct(selectedProduct.$id, claimerName.trim());
setShowConfetti(true);
notifications.show({
title: 'Produkt claimad!',
message: `Du har clamat ${selectedProduct.title}`,
color: 'green',
icon: <IconCheck />
});
setTimeout(() => setShowConfetti(false), 3000);
setClaimModalOpen(false);
setClaimerName('');
setSelectedProduct(null);
}
};

const handleUnclaim = (product) => {
onUnclaimProduct(product.$id);
notifications.show({
title: 'Claim borttagen',
message: `${product.title} är nu tillgänglig igen`,
color: 'blue'
});
};

const wiggleStyle = {
animation: 'wiggle 1.5s infinite',
'@keyframes wiggle': {
'0%, 100%': { transform: 'rotate(0deg)' },
'25%': { transform: 'rotate(1.5deg)' },
'75%': { transform: 'rotate(-1.5deg)' },
},
};

const popBadgeStyle = {
animation: 'pop 0.3s ease-out',
'@keyframes pop': {
'0%': { transform: 'scale(0.5)' },
'70%': { transform: 'scale(1.2)' },
'100%': { transform: 'scale(1)' },
},
};

const shimmerOverlay = {
position: 'absolute',
top: 0,
left: 0,
width: '100%',
height: '100%',
background: 'linear-gradient(120deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.1) 100%)',
animation: 'shimmer 2s infinite',
'@keyframes shimmer': {
'0%': { transform: 'translateX(-100%)' },
'100%': { transform: 'translateX(100%)' },
},
pointerEvents: 'none',
};

return (
<Container
size="lg"
py="xl"
sx={{
background: 'linear-gradient(120deg, #f0f4ff, #fff0f6)',
minHeight: '100vh',
borderRadius: 16,
}}
>
{showConfetti && <Confetti numberOfPieces={150} recycle={false} />}


  <Group justify="space-between" mb="xl">
    <Group>
      <IconGift size={32} />
      <Title order={1}>Min Önskelista</Title>
    </Group>
    <Button
      variant="subtle"
      leftSection={<IconSettings size={16} />}
      onClick={onGoToAdmin}
    >
      Admin
    </Button>
  </Group>

  {loading ? (
    <Card shadow="sm" padding="xl" radius="md" withBorder>
      <Text c="dimmed" ta="center">Laddar produkter...</Text>
    </Card>
  ) : products.length === 0 ? (
    <Card shadow="sm" padding="xl" radius="md" withBorder>
      <Text c="dimmed" ta="center">Önskelistan är tom. Adminen behöver lägga till produkter!</Text>
    </Card>
  ) : (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
      {products.map((product) => (
        <Card
          key={product.$id}
          shadow="md"
          padding="lg"
          radius="xl"
          withBorder
          sx={(theme) => ({
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': { transform: 'translateY(-5px)', boxShadow: theme.shadows.xl },
            ...( !product.claimed ? wiggleStyle : {} ),
          })}
        >
          <Card.Section>
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16 }}>
              <Image src={getImageUrl(product.image)} height={220} alt={product.title} fit="cover" />
              {/* Optional shimmer for new products */}
              {product.isNew && <div style={shimmerOverlay} />}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  width: '100%',
                  padding: '8px',
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                  color: 'white',
                  fontWeight: 'bold',
                }}
              >
                {product.title}
              </div>
            </div>
          </Card.Section>

          <Stack mt="md" gap="sm">
            <Group justify="space-between" align="flex-start">
              {product.quantity && product.quantity > 1 && (
                <Badge size="lg" variant="filled" color="gray">{product.quantity} st</Badge>
              )}
            </Group>

            <Transition mounted={true} transition="scale-y" duration={300} timingFunction="ease">
              {(styles) => (
                <Badge
                  style={{ ...styles, ...(!product.claimed ? popBadgeStyle : {}) }}
                  color={product.claimed ? 'green' : 'grape'}
                  variant="filled"
                  size="lg"
                  leftSection={product.claimed ? <IconCheck size={16} /> : <IconGift size={16} />}
                >
                  {product.claimed ? `Claimad av ${product.claimedBy}` : 'Tillgänglig'}
                </Badge>
              )}
            </Transition>

            <Group mt="md" gap="sm">
              {product.claimed ? (
                <Button
                  fullWidth
                  variant="outline"
                  color="red"
                  leftSection={<IconX size={16} />}
                  radius="xl"
                  styles={{ root: { transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.05)' } } }}
                  onClick={() => handleUnclaim(product)}
                >
                  Ta bort claim
                </Button>
              ) : (
                <Button
                  fullWidth
                  gradient={{ from: 'indigo', to: 'cyan' }}
                  onClick={() => handleClaimClick(product)}
                  leftSection={<IconCheck size={16} />}
                  radius="xl"
                  styles={{ root: { transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.05)' } } }}
                >
                  Claima produkt
                </Button>
              )}
              <Button
                fullWidth
                variant="light"
                component="a"
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                radius="xl"
              >
                Se produkt
              </Button>
            </Group>
          </Stack>
        </Card>
      ))}
    </div>
  )}

  <Modal
    opened={claimModalOpen}
    onClose={() => { setClaimModalOpen(false); setClaimerName(''); setSelectedProduct(null); }}
    title="Claima produkt"
    centered
    transition="slide-up"
    transitionDuration={300}
    transitionTimingFunction="ease"
  >
    <Stack>
      <Text>Du är på väg att claima: <strong>{selectedProduct?.title}</strong></Text>
      {selectedProduct?.quantity && selectedProduct.quantity > 1 && (
        <Text size="sm" c="dimmed">Antal: {selectedProduct.quantity} st</Text>
      )}
      <TextInput
        label="Ditt namn"
        placeholder="Skriv ditt namn"
        value={claimerName}
        onChange={(e) => setClaimerName(e.target.value)}
        onKeyPress={(e) => { if (e.key === 'Enter') handleClaimSubmit(); }}
      />
      <Group justify="flex-end" mt="md">
        <Button variant="subtle" onClick={() => setClaimModalOpen(false)}>Avbryt</Button>
        <Button onClick={handleClaimSubmit} disabled={!claimerName.trim()}>Claima</Button>
      </Group>
    </Stack>
  </Modal>
</Container>


);
}

export default WishlistView;
