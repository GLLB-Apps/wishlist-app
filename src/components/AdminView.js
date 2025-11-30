import {
Container, Title, Card, Image, Text, Button, Group, Stack, TextInput, ActionIcon, Paper, Tabs, Badge
} from '@mantine/core';
import { IconPlus, IconTrash, IconArrowLeft, IconLink, IconSearch, IconTrashX, IconEdit } from '@tabler/icons-react';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';

function AdminView({ products, loading, onAddProduct, onRemoveProduct, onBackToPublic, uploadImage, getImageUrl, onRemoveAll }) {
const [productUrl, setProductUrl] = useState('');
const [quantity, setQuantity] = useState(1);
const [isAdding] = useState(false);  // if you only read the value
const [searchQuery, setSearchQuery] = useState('');

// Manual product state
const [manualTitle, setManualTitle] = useState('');
const [manualPrice, setManualPrice] = useState('');
const [manualUrl, setManualUrl] = useState('');
const [manualImageUrl, setManualImageUrl] = useState('');
const [manualQuantity, setManualQuantity] = useState(1);

const filteredProducts = products.filter(product => {
if (!searchQuery.trim()) return true;
const searchLower = searchQuery.toLowerCase();
return (
product.title?.toLowerCase().includes(searchLower) ||
product.price?.toLowerCase().includes(searchLower) ||
product.claimedBy?.toLowerCase().includes(searchLower)
);
});

const handleRemoveProduct = (product) => {
if (window.confirm(`Är du säker på att du vill ta bort "${product.title}"?`)) {
onRemoveProduct(product.$id);
notifications.show({
title: 'Produkt borttagen',
message: `${product.title} har tagits bort`,
color: 'blue'
});
}
};

const handleRemoveAll = () => {
if (window.confirm(`Är du säker på att du vill ta bort ALLA ${products.length} produkter?`)) {
onRemoveAll();
notifications.show({
title: 'Alla produkter borttagna',
message: `${products.length} produkter har tagits bort`,
color: 'orange',
icon: <IconTrashX />
});
}
};

return (
<Container size="lg" py="xl" sx={{ background: 'linear-gradient(120deg, #f0f4ff, #fff0f6)', minHeight: '100vh', borderRadius: 16 }}> <Group justify="space-between" mb="xl"> <Title order={1}>Admin - Hantera Önskelista</Title>
<Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={onBackToPublic}>
Tillbaka till önskelista </Button> </Group>


  <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
    <Tabs defaultValue="auto">
      <Tabs.List>
        <Tabs.Tab value="auto" leftSection={<IconLink size={16} />}>Automatisk (scraping)</Tabs.Tab>
        <Tabs.Tab value="manual" leftSection={<IconEdit size={16} />}>Manuell</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="auto" pt="md">
        <Stack gap="md">
          <Title order={3}>Lägg till produkt automatiskt</Title>
          <Group align="flex-end">
            <TextInput
              placeholder="Klistra in produktlänk här..."
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              leftSection={<IconLink size={16} />}
              style={{ flex: 1 }}
              label="Produktlänk"
            />
            <TextInput
              placeholder="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(999, parseInt(e.target.value) || 1)))}
              type="number"
              style={{ width: 100 }}
              label="Antal"
            />
            <Button leftSection={<IconPlus size={16} />} onClick={() => onAddProduct(productUrl, quantity)} loading={isAdding}>
              Lägg till
            </Button>
          </Group>
          <Text size="sm" c="dimmed">
            Produktinfo hämtas automatiskt via Open Graph metadata. Bilder laddas upp till din bucket.
          </Text>
        </Stack>
      </Tabs.Panel>

      <Tabs.Panel value="manual" pt="md">
        <Stack gap="md">
          <Title order={3}>Lägg till produkt manuellt</Title>
          <TextInput placeholder="T.ex. iPhone 15 Pro Max" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} label="Produkttitel" required />
          <Group grow>
            <TextInput placeholder="T.ex. 12990 kr" value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} label="Pris" required />
            <TextInput placeholder="1" value={manualQuantity} onChange={(e) => setManualQuantity(Math.max(1, Math.min(999, parseInt(e.target.value) || 1)))} type="number" label="Antal" />
          </Group>
          <TextInput placeholder="https://exempel.se/produkt" value={manualUrl} onChange={(e) => setManualUrl(e.target.value)} leftSection={<IconLink size={16} />} label="Produktlänk" required />
          <TextInput placeholder="https://exempel.se/bild.jpg (valfritt)" value={manualImageUrl} onChange={(e) => setManualImageUrl(e.target.value)} label="Bild-URL (valfritt)" />
          <Button leftSection={<IconPlus size={16} />} onClick={() => onAddProduct({ title: manualTitle, price: manualPrice, url: manualUrl, image: manualImageUrl, quantity: manualQuantity })} loading={isAdding} fullWidth>
            Lägg till manuellt
          </Button>
        </Stack>
      </Tabs.Panel>
    </Tabs>
  </Paper>

  <Stack gap="md" mb="md">
    <Group justify="space-between" align="flex-end">
      <TextInput
        placeholder="Sök på titel, pris, claimad av..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        leftSection={<IconSearch size={16} />}
        style={{ flex: 1, maxWidth: 400 }}
      />
      <Group>
        <Text size="sm" c="dimmed">Visar {filteredProducts.length} av {products.length} produkter</Text>
        {searchQuery && <Button size="xs" variant="subtle" onClick={() => setSearchQuery('')}>Rensa sökning</Button>}
        {products.length > 0 && <Button size="xs" variant="filled" color="red" leftSection={<IconTrashX size={14} />} onClick={handleRemoveAll}>Töm alla ({products.length})</Button>}
      </Group>
    </Group>
  </Stack>

  <Title order={3} mb="md">Nuvarande produkter ({filteredProducts.length})</Title>

  {loading ? (
    <Card shadow="sm" padding="xl" radius="md" withBorder>
      <Text c="dimmed" ta="center">Laddar produkter...</Text>
    </Card>
  ) : filteredProducts.length === 0 ? (
    <Card shadow="sm" padding="xl" radius="md" withBorder>
      <Text c="dimmed" ta="center">{searchQuery ? 'Inga produkter matchade din sökning.' : 'Inga produkter tillagda än.'}</Text>
    </Card>
  ) : (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
      {filteredProducts.map((product) => (
        <Card key={product.$id} shadow="md" padding="lg" radius="xl" withBorder sx={(theme) => ({ transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-5px)', boxShadow: theme.shadows.xl } })}>
          <Card.Section>
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16 }}>
              <Image src={getImageUrl(product.image)} height={220} alt={product.title} fit="cover" />
              <div style={{ position: 'absolute', bottom: 0, width: '100%', padding: 8, background: 'linear-gradient(transparent, rgba(0,0,0,0.6))', color: 'white', fontWeight: 'bold' }}>
                {product.title}
              </div>
            </div>
          </Card.Section>

          <Stack mt="md" gap="sm">
            <Group justify="space-between" align="flex-start">
              {product.quantity && product.quantity > 1 && <Badge size="lg" variant="filled" color="gray">{product.quantity} st</Badge>}
              <ActionIcon color="red" variant="light" onClick={() => handleRemoveProduct(product)}><IconTrash size={18} /></ActionIcon>
            </Group>

            {product.claimed && <Badge color="green" variant="filled" size="lg">Claimad av {product.claimedBy}</Badge>}

            <Text size="xl" fw={700} c="blue">{product.price}</Text>

            <Button variant="light" component="a" href={product.url} target="_blank" rel="noopener noreferrer" fullWidth radius="xl">Se produkt</Button>
          </Stack>
        </Card>
      ))}
    </div>
  )}
</Container>


);
}

export default AdminView;
