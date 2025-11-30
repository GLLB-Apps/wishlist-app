import { Container, Title, Card, Image, Text, Button, Group, Badge, Stack, TextInput, Modal } from '@mantine/core';
import { IconGift, IconCheck, IconX, IconSettings } from '@tabler/icons-react';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';

function WishlistView({ products, loading, onClaimProduct, onUnclaimProduct, onGoToAdmin, getImageUrl }) {
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [claimerName, setClaimerName] = useState('');

  const handleClaimClick = (product) => {
    setSelectedProduct(product);
    setClaimModalOpen(true);
  };

  const handleClaimSubmit = () => {
    if (claimerName.trim()) {
      onClaimProduct(selectedProduct.$id, claimerName.trim());
      notifications.show({
        title: 'Produkt claimad!',
        message: `Du har clamat ${selectedProduct.title}`,
        color: 'green',
        icon: <IconCheck />
      });
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

  return (
    <Container size="lg" py="xl">
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
          <Text c="dimmed" ta="center">
            Laddar produkter...
          </Text>
        </Card>
      ) : products.length === 0 ? (
        <Card shadow="sm" padding="xl" radius="md" withBorder>
          <Text c="dimmed" ta="center">
            Önskelistan är tom. Adminen behöver lägga till produkter!
          </Text>
        </Card>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '1.5rem' 
        }}>
          {products.map((product) => (
            <Card key={product.$id} shadow="sm" padding="lg" radius="md" withBorder>
              <Card.Section>
                <Image
                  src={getImageUrl(product.image)}
                  height={200}
                  alt={product.title}
                  fit="cover"
                />
              </Card.Section>

              <Stack mt="md" gap="sm">
                <Group justify="space-between" align="flex-start">
                  <Text fw={500} size="lg" lineClamp={2} style={{ flex: 1 }}>
                    {product.title}
                  </Text>
                  {product.quantity && product.quantity > 1 && (
                    <Badge size="lg" variant="filled" color="gray">
                      {product.quantity} st
                    </Badge>
                  )}
                </Group>

                

                {product.claimed ? (
                  <Badge color="green" variant="filled" size="lg">
                    Claimad av {product.claimedBy}
                  </Badge>
                ) : (
                  <Badge color="gray" variant="light" size="lg">
                    Tillgänglig
                  </Badge>
                )}

                <Group mt="md" gap="sm">
                  {product.claimed ? (
                    <Button
                      fullWidth
                      variant="outline"
                      color="red"
                      leftSection={<IconX size={16} />}
                      onClick={() => handleUnclaim(product)}
                    >
                      Ta bort claim
                    </Button>
                  ) : (
                    <Button
                      fullWidth
                      leftSection={<IconCheck size={16} />}
                      onClick={() => handleClaimClick(product)}
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
        onClose={() => {
          setClaimModalOpen(false);
          setClaimerName('');
          setSelectedProduct(null);
        }}
        title="Claima produkt"
        centered
      >
        <Stack>
          <Text>
            Du är på väg att claima: <strong>{selectedProduct?.title}</strong>
          </Text>
          {selectedProduct?.quantity && selectedProduct.quantity > 1 && (
            <Text size="sm" c="dimmed">
              Antal: {selectedProduct.quantity} st
            </Text>
          )}
          <TextInput
            label="Ditt namn"
            placeholder="Skriv ditt namn"
            value={claimerName}
            onChange={(e) => setClaimerName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleClaimSubmit();
              }
            }}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setClaimModalOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleClaimSubmit} disabled={!claimerName.trim()}>
              Claima
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

export default WishlistView;  