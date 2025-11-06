// src/components/admin/ProductModal.tsx - VERSÃO COM ÍCONE CORRIGIDO

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Product } from '../../types/Product';
import { Category } from '../../types/Category';
import { toast } from 'react-toastify';
// --- CORREÇÃO 1: Usando um ícone que sabemos que existe e renomeando para clareza ---
import { Package as UploadIcon } from 'lucide-react';

interface ProductModalProps {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
}

export default function ProductModal({ product, categories, onClose }: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    imageUrl: '',
    stockQuantity: '0',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: String(product.price || ''),
        categoryId: product.category_id || '',
        imageUrl: product.image_url || '',
        stockQuantity: String(product.stock_quantity || '0'),
      });
      setPreviewUrl(product.image_url || null);
    } else {
      setFormData({ name: '', description: '', price: '', categoryId: '', imageUrl: '', stockQuantity: '0' });
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  }, [product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.categoryId) {
      toast.error('Por favor, selecione uma categoria.');
      return;
    }
    
    setIsSubmitting(true);
    let finalImageUrl = formData.imageUrl;

    if (selectedFile) {
      const fileName = `${Date.now()}-${selectedFile.name.replace(/\s/g, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, selectedFile);

      if (uploadError) {
        toast.error(`Erro no upload da imagem: ${uploadError.message}`);
        setIsSubmitting(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);
      
      finalImageUrl = publicUrlData.publicUrl;
    }

    const productData = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      category_id: formData.categoryId,
      image_url: finalImageUrl,
      stock_quantity: parseInt(formData.stockQuantity, 10) || 0,
    };

    try {
      let error;
      if (product) {
        const { error: updateError } = await supabase.from('products').update(productData).eq('id', product.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('products').insert([productData]);
        error = insertError;
      }

      if (error) {
        toast.error('Erro ao salvar produto: ' + error.message);
      } else {
        toast.success(`Produto ${product ? 'atualizado' : 'criado'} com sucesso!`);
        onClose();
      }
    } catch (err: any) {
      toast.error('Erro inesperado ao salvar o produto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">{product ? 'Editar Produto' : 'Adicionar Novo Produto'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-1">Nome do Produto</label>
                <input name="name" type="text" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Preço</label>
                <input name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Categoria</label>
                <select name="categoryId" value={formData.categoryId} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" required>
                  <option value="" disabled>Selecione uma categoria</option>
                  {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Quantidade em Estoque</label>
                <input name="stockQuantity" type="number" min="0" value={formData.stockQuantity} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-1">Fazer Upload da Imagem</label>
                <label htmlFor="file-upload" className="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                  {/* --- CORREÇÃO 2: Usando o ícone renomeado --- */}
                  <UploadIcon className="h-5 w-5 text-gray-500" />
                  <span className="text-gray-600">{selectedFile ? 'Arquivo selecionado!' : 'Escolher arquivo'}</span>
                </label>
                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" />
                {selectedFile && <p className="text-xs text-gray-500 mt-1 truncate">Arquivo: {selectedFile.name}</p>}
              </div>

              <div className="text-center text-sm text-gray-500">ou</div>

              <div>
                <label className="block text-gray-700 mb-1">Colar URL da Imagem</label>
                <input name="imageUrl" type="text" value={formData.imageUrl} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" placeholder="https://exemplo.com/imagem.png" />
              </div>

              {(previewUrl || formData.imageUrl ) && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pré-visualização:</p>
                  <img src={previewUrl || formData.imageUrl} alt="Pré-visualização" className="w-full h-40 object-contain rounded-lg border bg-gray-50" />
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6">
            <label className="block text-gray-700 mb-1">Descrição</label>
            <textarea name="description" value={formData.description} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" rows={3}></textarea>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300">{isSubmitting ? 'Salvando...' : 'Salvar Produto'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
