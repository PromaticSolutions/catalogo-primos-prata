import { X, Trash2, Plus } from 'lucide-react';
import { useCart } from '../lib/useCart';
import { useState } from 'react';
import { supabase, SiteSettings, Product } from '../lib/supabase'; // Importa Product
import { toast } from 'react-toastify';
import QRCode from 'qrcode';

interface CartModalProps {
  settings: SiteSettings;
  onClose: () => void;
}

// NOVO TIPO: Para guardar os dados do pedido finalizado
interface FinalizedOrder {
  items: (Product & { quantity: number })[];
  total: number;
}

export default function CartModal({ settings, onClose }: CartModalProps) {
  const { cart, removeFromCart, updateQuantity, clearCart, totalPrice } = useCart();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  
  // NOVO ESTADO: para armazenar os detalhes do pedido após a finalização
  const [finalizedOrder, setFinalizedOrder] = useState<FinalizedOrder | null>(null);

  const handleFinalizeOrder = async () => {
    if (!settings.pix_key) {
      toast.error('A chave PIX não está configurada pelo administrador.');
      return;
    }
    setIsSubmitting(true);

    // CAPTURA OS DADOS ANTES DE QUALQUER COISA
    const orderData: FinalizedOrder = { items: cart, total: totalPrice };
    setFinalizedOrder(orderData);

    const saleDescription = orderData.items.map(item => `${item.quantity}x ${item.name}`).join(', ');

    const { data: newSale, error } = await supabase
      .from('sales')
      .insert({
        product_name: saleDescription,
        quantity: orderData.items.reduce((acc, item) => acc + item.quantity, 0),
        total_amount: orderData.total,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        status: 'pending',
        product_id: null, 
        unit_price: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar venda no Supabase:", error);
      toast.error('Erro ao criar seu pedido. Tente novamente.');
      setIsSubmitting(false);
      return;
    }

    if (newSale) {
      try {
        const qrCodeDataUrl = await QRCode.toDataURL(settings.pix_key, { width: 280, margin: 2 });
        setQrCodeUrl(qrCodeDataUrl);
        setOrderCreated(true);
        toast.success("Pedido criado! Agora realize o pagamento.");
        clearCart(); // Limpa o carrinho SÓ DEPOIS que tudo deu certo
      } catch (qrError) {
        console.error('Erro ao gerar QR Code:', qrError);
        toast.error('Pedido criado, mas houve um erro ao gerar o QR Code.');
      }
    }
    
    setIsSubmitting(false);
  };
  
  // MENSAGEM DO WHATSAPP: Agora usa os dados do 'finalizedOrder'
  const whatsappMessage = finalizedOrder 
    ? encodeURIComponent(`Olá! Tenho interesse no pedido com os seguintes itens: ${finalizedOrder.items.map(item => `${item.quantity}x ${item.name}`).join(', ')} (Total: R$ ${finalizedOrder.total.toFixed(2)}). Segue o comprovante de pagamento.`)
    : '';
  const whatsappLink = `https://wa.me/5511934476935?text=${whatsappMessage}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full relative max-h-[90vh] flex flex-col">
        
        <div className="p-6 border-b flex-shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            {orderCreated ? 'Finalize o Pagamento' : 'Seu Carrinho'}
          </h2>
        </div>

        {!orderCreated ? (
          <>
            <div className="flex-grow overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Seu carrinho está vazio.</p>
               ) : (
                cart.map(item => (
                  <div key={item.id} className="flex items-center gap-4">
                    <img src={item.image_url} alt={item.name} className="h-16 w-16 rounded object-cover" />
                    <div className="flex-grow">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-gray-500">R$ {item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 font-bold">-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"><Plus size={18} /></button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t flex-shrink-0 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seu nome (opcional)</label>
                  <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Digite seu nome" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone (opcional)</label>
                  <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="(00) 00000-0000" />
                </div>
                <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Total:</span>
                  <span className="text-2xl font-bold" style={{ color: settings.primary_color }}>R$ {totalPrice.toFixed(2)}</span>
                </div>
                <button onClick={handleFinalizeOrder} disabled={isSubmitting} className="w-full text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50" style={{ backgroundColor: settings.primary_color }}>
                  {isSubmitting ? 'Finalizando...' : 'Finalizar Compra e Gerar PIX'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-grow overflow-y-auto p-6 space-y-4 text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-800 font-medium">✓ Pedido criado! Pague o valor abaixo.</p>
            </div>
            {/* VALOR A PAGAR: Agora usa os dados do 'finalizedOrder' */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Valor total a pagar:</strong>
                <span className="text-xl font-bold ml-2">R$ {finalizedOrder?.total.toFixed(2)}</span>
              </p>
            </div>
            {qrCodeUrl && (
              <div className="flex flex-col items-center">
                <p className="text-sm text-gray-600 mb-2">1. Escaneie o QR Code com seu app do banco:</p>
                <img src={qrCodeUrl} alt="QR Code PIX" className="border-2 border-gray-300 rounded-lg" />
                <p className="text-xs text-gray-500 mt-2">Você precisará digitar o valor do pedido.</p>
              </div>
            )}
            <div className="pt-4">
              <p className="text-sm text-gray-600 mb-2">2. Após pagar, envie o comprovante:</p>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2">
                <span className="mr-2">📲</span>
                Enviar Comprovante via WhatsApp
              </a>
            </div>
            <button onClick={onClose} className="w-full text-sm text-gray-500 hover:text-gray-700 pt-4">
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
