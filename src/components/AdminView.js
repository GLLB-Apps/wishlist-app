import { Container, Title, Card, Image, Text, Button, Group, Stack, TextInput, ActionIcon, Paper, Tabs } from '@mantine/core';
import { IconPlus, IconTrash, IconArrowLeft, IconLink, IconSearch, IconTrashX, IconEdit } from '@tabler/icons-react';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';

function AdminView({ products, loading, onAddProduct, onRemoveProduct, onBackToPublic, uploadImage, getImageUrl, onRemoveAll }) {
  const [productUrl, setProductUrl] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Manuell tillägg state
  const [manualTitle, setManualTitle] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [manualQuantity, setManualQuantity] = useState(1);

  const scrapeProductMetadata = async (url) => {
    try {
      const proxies = [
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
      ];
      
      let html = null;
      
      for (const proxyUrl of proxies) {
        try {
          console.log('Försöker med proxy:', proxyUrl);
          const response = await fetch(proxyUrl, { timeout: 10000 });
          if (response.ok) {
            html = await response.text();
            console.log('Proxy fungerade!');
            break;
          }
        } catch (error) {
          console.warn('Proxy misslyckades, försöker nästa...', error.message);
        }
      }
      
      if (!html) {
        throw new Error('Kunde inte hämta sidan via någon proxy. Testa med en annan URL eller lägg till produkten manuellt.');
      }
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const getMetaContent = (property) => {
        const meta = doc.querySelector(`meta[property="${property}"]`) || 
                     doc.querySelector(`meta[name="${property}"]`);
        return meta ? meta.getAttribute('content') : null;
      };
      
      const title = getMetaContent('og:title') || 
                   getMetaContent('twitter:title') ||
                   doc.querySelector('h1')?.textContent ||
                   doc.querySelector('title')?.textContent ||
                   'Okänd produkt';
      
      let imageUrl = getMetaContent('og:image') || 
                     getMetaContent('twitter:image') ||
                     doc.querySelector('img[class*="product"]')?.src ||
                     doc.querySelector('img')?.src;
      
      if (imageUrl && !imageUrl.startsWith('http')) {
        const urlObj = new URL(url);
        imageUrl = urlObj.origin + (imageUrl.startsWith('/') ? '' : '/') + imageUrl;
      }
      
      const price = getMetaContent('product:price:amount') ||
                   getMetaContent('og:price:amount') ||
                   doc.querySelector('[itemprop="price"]')?.textContent ||
                   doc.querySelector('[class*="price"]')?.textContent ||
                   extractPriceFromText(html);
      
      let uploadedImageId = null;
      if (imageUrl) {
        try {
          uploadedImageId = await downloadAndUploadImage(imageUrl);
        } catch (imgError) {
          console.warn('Kunde inte ladda upp bild, använder original-URL:', imgError);
          uploadedImageId = imageUrl;
        }
      }
      
      return {
        title: title.trim().substring(0, 200),
        price: formatPrice(price),
        image: uploadedImageId || 'https://via.placeholder.com/400',
        url: url
      };
    } catch (error) {
      console.error('Scraping-fel:', error);
      throw new Error(error.message || 'Kunde inte hämta produktinformation. Kontrollera URL:en.');
    }
  };

  const downloadAndUploadImage = async (imageUrl) => {
    try {
      const proxies = [
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(imageUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(imageUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`
      ];
      
      let blob = null;
      
      for (const proxyUrl of proxies) {
        try {
          const response = await fetch(proxyUrl);
          if (response.ok) {
            blob = await response.blob();
            break;
          }
        } catch (error) {
          console.warn('Bildproxy misslyckades, försöker nästa...');
        }
      }
      
      if (!blob) {
        throw new Error('Kunde inte ladda ner bild');
      }
      
      const filename = `product-${Date.now()}.jpg`;
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
      
      const fileId = await uploadImage(file);
      
      return fileId;
    } catch (error) {
      console.error('Bilduppladdning misslyckades:', error);
      throw error;
    }
  };

  const extractPriceFromText = (html) => {
    const pricePatterns = [
      /(\d[\d\s]*\d|\d+)\s*kr/i,
      /(\d[\d\s]*\d|\d+):-/i,
      /pris[:\s]+(\d[\d\s]*\d|\d+)/i,
      /(\d+[.,]\d+)\s*SEK/i,
      /SEK\s*(\d+[.,]\d+)/i
    ];
    
    for (const pattern of pricePatterns) {
      const match = html.match(pattern);
      if (match) {
        return match[1].replace(/\s/g, '').replace(',', '.');
      }
    }
    
    return null;
  };

  const formatPrice = (price) => {
    if (!price) return 'Pris saknas';
    
    const cleanPrice = price.toString()
      .replace(/\s/g, '')
      .replace(/[^\d.,]/g, '')
      .replace(',', '.');
    
    const numPrice = parseFloat(cleanPrice);
    
    if (isNaN(numPrice)) return 'Pris saknas';
    
    return Math.round(numPrice).toLocaleString('sv-SE') + ' kr';
  };

  const handleAddProduct = async () => {
    if (!productUrl.trim()) {
      notifications.show({
        title: 'Fel',
        message: 'Ange en produkt-URL',
        color: 'red'
      });
      return;
    }

    try {
      setIsAdding(true);
      
      notifications.show({
        id: 'scraping',
        title: 'Hämtar produktinfo...',
        message: 'Detta kan ta några sekunder',
        loading: true,
        autoClose: false
      });
      
      const productInfo = await scrapeProductMetadata(productUrl.trim());
      
      notifications.hide('scraping');
      
      await onAddProduct({ ...productInfo, quantity });
      
      notifications.show({
        title: 'Produkt tillagd!',
        message: `${quantity}x av ${productInfo.title} har lagts till`,
        color: 'green',
        icon: <IconPlus />
      });
      
      setProductUrl('');
      setQuantity(1);
    } catch (error) {
      notifications.hide('scraping');
      console.error('Fel vid tillägg:', error);
      notifications.show({
        title: 'Ett fel uppstod',
        message: error.message,
        color: 'red',
        autoClose: 7000
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleManualAddProduct = async () => {
    if (!manualTitle.trim() || !manualPrice.trim() || !manualUrl.trim()) {
      notifications.show({
        title: 'Fel',
        message: 'Fyll i titel, pris och produktlänk',
        color: 'red'
      });
      return;
    }

    try {
      setIsAdding(true);
      
      notifications.show({
        id: 'manual-adding',
        title: 'Lägger till produkt...',
        loading: true,
        autoClose: false
      });

      let imageId = manualImageUrl.trim() || 'https://via.placeholder.com/400';
      
      // Om användaren angav en bild-URL, försök ladda upp den
      if (manualImageUrl.trim() && manualImageUrl.startsWith('http')) {
        try {
          imageId = await downloadAndUploadImage(manualImageUrl.trim());
        } catch (error) {
          console.warn('Kunde inte ladda upp bild, använder URL direkt');
          imageId = manualImageUrl.trim();
        }
      }

      const productInfo = {
        title: manualTitle.trim(),
        price: formatPrice(manualPrice.trim()),
        image: imageId,
        url: manualUrl.trim(),
        quantity: manualQuantity
      };
      
      notifications.hide('manual-adding');
      
      await onAddProduct(productInfo);
      
      notifications.show({
        title: 'Produkt tillagd!',
        message: `${manualQuantity}x av ${productInfo.title} har lagts till`,
        color: 'green',
        icon: <IconPlus />
      });
      
      // Rensa formuläret
      setManualTitle('');
      setManualPrice('');
      setManualUrl('');
      setManualImageUrl('');
      setManualQuantity(1);
    } catch (error) {
      notifications.hide('manual-adding');
      console.error('Fel vid manuell tillägg:', error);
      notifications.show({
        title: 'Ett fel uppstod',
        message: error.message,
        color: 'red',
        autoClose: 7000
      });
    } finally {
      setIsAdding(false);
    }
  };

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
    if (window.confirm(`Är du säker på att du vill ta bort ALLA ${products.length} produkter? Detta går inte att ångra!`)) {
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
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Admin - Hantera Önskelista</Title>
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={onBackToPublic}
        >
          Tillbaka till önskelista
        </Button>
      </Group>

      <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
        <Tabs defaultValue="auto">
          <Tabs.List>
            <Tabs.Tab value="auto" leftSection={<IconLink size={16} />}>
              Automatisk (scraping)
            </Tabs.Tab>
            <Tabs.Tab value="manual" leftSection={<IconEdit size={16} />}>
              Manuell
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="auto" pt="md">
            <Stack gap="md">
              <Title order={3}>Lägg till produkt automatiskt</Title>
              <Group align="flex-end">
                <TextInput
                  placeholder="Klistra in produktlänk här..."
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddProduct();
                    }
                  }}
                  leftSection={<IconLink size={16} />}
                  style={{ flex: 1 }}
                  size="md"
                  label="Produktlänk"
                />
                <TextInput
                  placeholder="1"
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setQuantity(Math.max(1, Math.min(999, val)));
                  }}
                  type="number"
                  min={1}
                  max={999}
                  style={{ width: '100px' }}
                  size="md"
                  label="Antal"
                />
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={handleAddProduct}
                  loading={isAdding}
                  size="md"
                >
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
              <TextInput
                placeholder="T.ex. iPhone 15 Pro Max"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                size="md"
                label="Produkttitel"
                required
              />
              <Group grow>
                <TextInput
                  placeholder="T.ex. 12990 kr"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  size="md"
                  label="Pris"
                  required
                />
                <TextInput
                  placeholder="1"
                  value={manualQuantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setManualQuantity(Math.max(1, Math.min(999, val)));
                  }}
                  type="number"
                  min={1}
                  max={999}
                  size="md"
                  label="Antal"
                />
              </Group>
              <TextInput
                placeholder="https://exempel.se/produkt"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                leftSection={<IconLink size={16} />}
                size="md"
                label="Produktlänk"
                required
              />
              <TextInput
                placeholder="https://exempel.se/bild.jpg (valfritt)"
                value={manualImageUrl}
                onChange={(e) => setManualImageUrl(e.target.value)}
                size="md"
                label="Bild-URL (valfritt)"
              />
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={handleManualAddProduct}
                loading={isAdding}
                size="md"
                fullWidth
              >
                Lägg till manuellt
              </Button>
              <Text size="sm" c="dimmed">
                Fyll i produktinformation manuellt. Om du anger en bild-URL försöker vi ladda upp den till din bucket.
              </Text>
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
            style={{ flex: 1, maxWidth: '400px' }}
            size="md"
          />
          <Group>
            <Text size="sm" c="dimmed">
              Visar {filteredProducts.length} av {products.length} produkter
            </Text>
            {searchQuery && (
              <Button
                size="xs"
                variant="subtle"
                onClick={() => setSearchQuery('')}
              >
                Rensa sökning
              </Button>
            )}
            {products.length > 0 && (
              <Button
                size="xs"
                variant="filled"
                color="red"
                leftSection={<IconTrashX size={14} />}
                onClick={handleRemoveAll}
              >
                Töm alla ({products.length})
              </Button>
            )}
          </Group>
        </Group>
      </Stack>

      <Title order={3} mb="md">
        Nuvarande produkter ({filteredProducts.length})
      </Title>

      {loading ? (
        <Card shadow="sm" padding="xl" radius="md" withBorder>
          <Text c="dimmed" ta="center">
            Laddar produkter...
          </Text>
        </Card>
      ) : filteredProducts.length === 0 ? (
        <Card shadow="sm" padding="xl" radius="md" withBorder>
          <Text c="dimmed" ta="center">
            {searchQuery
              ? 'Inga produkter matchade din sökning.'
              : 'Inga produkter tillagda än. Lägg till din första produkt ovan!'
            }
          </Text>
        </Card>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '1.5rem' 
        }}>
          {filteredProducts.map((product) => (
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
                  <ActionIcon
                    color="red"
                    variant="light"
                    onClick={() => handleRemoveProduct(product)}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>

                <Group justify="space-between">
                  <Text size="xl" fw={700} c="blue">
                    {product.price}
                  </Text>
                  {product.quantity && product.quantity > 1 && (
                    <Text size="sm" fw={600} c="gray">
                      Antal: {product.quantity}
                    </Text>
                  )}
                </Group>

                {product.claimed && (
                  <Text size="sm" c="dimmed">
                    Claimad av: {product.claimedBy}
                  </Text>
                )}

                <Button
                  variant="light"
                  component="a"
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="sm"
                >
                  Se produkt
                </Button>
              </Stack>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}

export default AdminView;