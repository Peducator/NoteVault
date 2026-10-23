'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Upload,
  Button,
  Alert,
  Typography,
  Flex,
  Card,
  Space,
  App,
} from 'antd';
import {
  UploadOutlined,
  ScanOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  FileImageOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { expenseApi } from '../apis/expenseApi';
import { unitApi } from '../apis/unitApi';
import { categoryApi, CategoryItem } from '../apis/categoryApi';
import { CategoryManagementModal } from './CategoryManagementModal';

const { Text, Paragraph } = Typography;

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  units?: { id: number; name: string; isLeaf?: boolean }[];
  defaultUnitId?: number;
  onSubmit?: (data: {
    amount: number;
    categoryId?: number;
    category: string;
    purpose: string;
    unitId?: number;
    taxCode?: string;
    vendorName?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    vatAmount?: number;
    receiptUrl?: string;
  }) => Promise<any> | void;
}

function findMatchingCategory(rawCat: string, list: CategoryItem[]): CategoryItem | undefined {
  if (!rawCat || list.length === 0) return undefined;
  const clean = rawCat.toLowerCase().trim();
  const exact = list.find((c) => c.name.toLowerCase() === clean);
  if (exact) return exact;
  const sub = list.find((c) => c.name.toLowerCase().includes(clean) || clean.includes(c.name.toLowerCase()));
  if (sub) return sub;
  return undefined;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  units,
  defaultUnitId,
  onSubmit,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [availableUnits, setAvailableUnits] = useState<{ id: number; name: string }[]>(units || []);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isManageCategoryOpen, setIsManageCategoryOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatusText, setScanStatusText] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taxData, setTaxData] = useState<{
    taxCode: string;
    companyName: string;
    isValid: boolean;
  } | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await categoryApi.getCategories();
      if (res.success && Array.isArray(res.data)) {
        setCategories(res.data);
        return res.data;
      }
    } catch {
      // fallback if needed
    }
    return [];
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setImagePreview(null);
      setTaxData(null);
      setScanError(null);
      return;
    }

    form.resetFields();

    fetchCategories().then((fetchedCats) => {
      const defaultCat = fetchedCats && fetchedCats.length > 0 ? fetchedCats[0] : null;
      if (defaultCat) {
        form.setFieldsValue({
          categoryId: defaultCat.id,
          category: defaultCat.name,
        });
      }
    });

    if (units && units.length > 0) {
      setAvailableUnits(units);
      form.setFieldsValue({
        unitId: defaultUnitId || units[0].id,
        invoiceDate: dayjs(),
      });
    } else {
      unitApi
        .getUnitTree()
        .then((res: any) => {
          const raw = res.data;
          const list = Array.isArray(raw) ? raw : raw?.flat || [];
          setAvailableUnits(list);
          if (list.length > 0) {
            form.setFieldsValue({
              unitId: defaultUnitId || list[0].id,
              invoiceDate: dayjs(),
            });
          }
        })
        .catch(() => {});
    }
  }, [isOpen, units, defaultUnitId, form, fetchCategories]);

  const handleUploadChange = async (file: File) => {
    setScanError(null);
    setTaxData(null);

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setIsScanning(true);
    setScanStatusText('Đang nạp ảnh hóa đơn và bóc tách AI OCR...');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const scanRes = await expenseApi.scanInvoice({ imageBase64: base64Data, mimeType: file.type });

          if (scanRes.success && scanRes.data) {
            const parsed = scanRes.data;
            const detectedAmount = parsed.amount !== undefined && parsed.amount !== null
              ? Number(parsed.amount)
              : (parsed.totalAmount ? Number(parsed.totalAmount) : undefined);
            const detectedCategoryStr = parsed.category || parsed.suggestedCategory || 'Ăn uống';
            const detectedPurpose = parsed.purpose || (parsed.vendorName ? `Thanh toán ${parsed.vendorName}` : '');
            const detectedDate = parsed.date ? dayjs(parsed.date) : dayjs();

            // AI category auto-matching
            const matched = findMatchingCategory(detectedCategoryStr, categories);
            const resolvedCategoryId = matched?.id || (categories.length > 0 ? categories[0].id : undefined);
            const resolvedCategoryName = matched?.name || detectedCategoryStr;

            form.setFieldsValue({
              amount: detectedAmount,
              purpose: detectedPurpose,
              categoryId: resolvedCategoryId,
              category: resolvedCategoryName,
              invoiceDate: detectedDate,
              invoiceNumber: parsed.invoiceNumber || '',
              taxCode: parsed.taxCode || '',
              vendorName: parsed.vendorName || '',
              vatAmount: parsed.vatAmount ? Number(parsed.vatAmount) : undefined,
            });

            if (parsed.taxCode) {
              setTaxData({
                taxCode: parsed.taxCode,
                companyName: parsed.vendorName || 'Đơn vị bán hàng',
                isValid: true,
              });
            }
            message.success(`AI đã bóc tách hóa đơn & chọn mục [${resolvedCategoryName}]`);
          }
        } catch (err: any) {
          setScanError('Không thể bóc tách tự động: ' + (err.message || 'Lỗi xử lý ảnh'));
        } finally {
          setIsScanning(false);
        }
      };
    } catch (err: any) {
      setScanError('Lỗi đọc tệp: ' + err.message);
      setIsScanning(false);
    }
    return false;
  };

  const handleFinish = async (values: any) => {
    try {
      setIsSubmitting(true);
      const selectedCat = categories.find((c) => c.id === values.categoryId);
      const categoryName = selectedCat?.name || values.category || 'Khác';

      if (onSubmit) {
        await onSubmit({
          amount: Number(values.amount),
          categoryId: values.categoryId,
          category: categoryName,
          purpose: values.purpose,
          unitId: values.unitId,
          taxCode: values.taxCode,
          vendorName: values.vendorName,
          invoiceNumber: values.invoiceNumber,
          invoiceDate: values.invoiceDate ? values.invoiceDate.format('YYYY-MM-DD') : undefined,
          vatAmount: values.vatAmount ? Number(values.vatAmount) : undefined,
          receiptUrl: imagePreview || undefined,
        });
      }
      message.success('Nộp đề nghị hoàn ứng thành công!');
      onClose();
    } catch (err: any) {
      message.error(err?.message || 'Có lỗi xảy ra khi nộp hóa đơn');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        title={
          <Flex align="center" gap="small">
            <SafetyCertificateOutlined style={{ color: '#2563eb', fontSize: 20 }} />
            <span>Tạo khoản chi tiêu / Nộp hóa đơn hoàn ứng</span>
          </Flex>
        }
        open={isOpen}
        onCancel={onClose}
        footer={null}
        width={680}
        destroyOnHidden
      >
        <div style={{ padding: '12px 0' }}>
          {/* Khu vực Upload OCR */}
          <Card
            style={{
              background: 'rgba(37, 99, 235, 0.03)',
              borderColor: 'rgba(37, 99, 235, 0.2)',
              marginBottom: 20,
            }}
          >
            <Flex vertical align="center" gap="small" style={{ textAlign: 'center' }}>
              <ScanOutlined style={{ fontSize: 28, color: '#2563eb' }} />
              <Text strong style={{ fontSize: 14 }}>
                Bóc tách hóa đơn tự động với AI OCR
              </Text>
              <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
                Chụp hoặc tải ảnh hóa đơn (JPG, PNG). AI sẽ tự động đọc số tiền, mã số thuế và tự khớp danh mục chi phí.
              </Paragraph>

              <Upload
                showUploadList={false}
                beforeUpload={(file) => {
                  handleUploadChange(file);
                  return false;
                }}
                accept="image/*"
              >
                <Button icon={<UploadOutlined />} type="dashed" loading={isScanning}>
                  {isScanning ? scanStatusText : 'Chọn ảnh hóa đơn hoặc chụp từ máy'}
                </Button>
              </Upload>

              {imagePreview && (
                <Flex align="center" gap="small" style={{ marginTop: 8 }}>
                  <FileImageOutlined />
                  <Text type="success" style={{ fontSize: 12 }}>
                    Đã tải tệp hóa đơn
                  </Text>
                </Flex>
              )}
            </Flex>
          </Card>

          {scanError && (
            <Alert title={scanError} type="warning" showIcon closable style={{ marginBottom: 16 }} />
          )}

          {taxData && (
            <Alert
              title={
                <Flex align="center" gap="small">
                  <CheckCircleOutlined style={{ color: '#16a34a' }} />
                  <Text strong>Xác thực hóa đơn: {taxData.companyName} (MST: {taxData.taxCode})</Text>
                </Flex>
              }
              type="success"
              showIcon={false}
              style={{ marginBottom: 16 }}
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            requiredMark="optional"
            size="middle"
          >
            {/* Ẩn tên category dạng chữ */}
            <Form.Item name="category" hidden>
              <Input />
            </Form.Item>

            {/* Hàng 1: Số tiền chi tiêu & Ngày lập hóa đơn */}
            <Flex gap="middle" style={{ width: '100%' }}>
              <Form.Item
                label={<Text strong>Số tiền chi tiêu (VND)</Text>}
                name="amount"
                rules={[
                  { required: true, message: 'Vui lòng nhập số tiền' },
                  {
                    validator: async (_, val) => {
                      if (val !== undefined && Number(val) <= 0) {
                        throw new Error('Số tiền phải lớn hơn 0');
                      }
                    },
                  },
                ]}
                style={{ flex: 1 }}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                  placeholder="Ví dụ: 4,221,000"
                  suffix="VND"
                />
              </Form.Item>

              <Form.Item
                label={<Text strong>Ngày lập hóa đơn / Ngày chi</Text>}
                name="invoiceDate"
                rules={[{ required: true, message: 'Vui lòng chọn ngày lập hóa đơn' }]}
                style={{ flex: 1 }}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  placeholder="Chọn ngày lập"
                />
              </Form.Item>
            </Flex>

            {/* Hàng 2: Danh mục chi phí & Đơn vị thụ hưởng */}
            <Flex gap="middle" style={{ width: '100%' }}>
              <Form.Item
                label={
                  <Flex justify="space-between" align="center" style={{ width: '100%' }}>
                    <Text strong>Danh mục chi phí</Text>
                    <Button
                      type="link"
                      size="small"
                      icon={<SettingOutlined />}
                      onClick={() => setIsManageCategoryOpen(true)}
                      style={{ padding: 0, fontSize: 12 }}
                    >
                      Quản lý
                    </Button>
                  </Flex>
                }
                name="categoryId"
                rules={[{ required: true, message: 'Vui lòng chọn danh mục' }]}
                style={{ flex: 1 }}
              >
                <Select
                  placeholder="Chọn danh mục chi"
                  options={categories.map((c) => ({
                    value: c.id,
                    label: `${c.icon === 'coffee' ? '☕' : c.icon === 'flight' ? '🚗' : c.icon === 'shopping' ? '🛍️' : c.icon === 'cloud' ? '☁️' : '📁'} ${c.name}`,
                  }))}
                  onChange={(val) => {
                    const sel = categories.find((c) => c.id === val);
                    if (sel) form.setFieldsValue({ category: sel.name });
                  }}
                />
              </Form.Item>

              <Form.Item
                label={<Text strong>Đơn vị / Phòng ban thụ hưởng</Text>}
                name="unitId"
                rules={[{ required: true, message: 'Vui lòng chọn đơn vị' }]}
                style={{ flex: 1 }}
              >
                <Select
                  placeholder="Chọn phòng ban chi"
                  options={availableUnits.map((u) => ({
                    value: u.id,
                    label: u.name,
                  }))}
                />
              </Form.Item>
            </Flex>

            {/* Hàng 3: Nội dung / Mục đích chi tiêu */}
            <Form.Item
              label={<Text strong>Nội dung / Mục đích chi tiêu</Text>}
              name="purpose"
              rules={[{ required: true, message: 'Vui lòng nhập mục đích chi tiêu' }]}
            >
              <Input placeholder="Ví dụ: Mua bàn ủi hơi nước đứng Philips..." />
            </Form.Item>

            {/* Hàng 4: Tên đơn vị bán & Số hóa đơn */}
            <Flex gap="middle" style={{ width: '100%' }}>
              <Form.Item
                label={<Text strong>Tên đơn vị bán (nếu có)</Text>}
                name="vendorName"
                style={{ flex: 1 }}
              >
                <Input placeholder="Ví dụ: Siêu thị Điện máy Chợ Lớn" />
              </Form.Item>

              <Form.Item
                label={<Text strong>Số hóa đơn / Số biên nhận (nếu có)</Text>}
                name="invoiceNumber"
                style={{ flex: 1 }}
              >
                <Input placeholder="Ví dụ: H190005/21-Q001, 1149405..." />
              </Form.Item>
            </Flex>

            {/* Hàng 5: Mã số thuế & Tiền thuế VAT */}
            <Flex gap="middle" style={{ width: '100%' }}>
              <Form.Item
                label={<Text strong>Mã số thuế người bán (nếu có)</Text>}
                name="taxCode"
                style={{ flex: 1 }}
              >
                <Input placeholder="0101234567" />
              </Form.Item>

              <Form.Item
                label={<Text strong>Tiền thuế VAT (nếu có)</Text>}
                name="vatAmount"
                style={{ flex: 1 }}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                  placeholder="Tiền thuế VAT (VND)"
                  suffix="VND"
                />
              </Form.Item>
            </Flex>

            <Flex justify="flex-end" gap="small" style={{ marginTop: 24 }}>
              <Button onClick={onClose} disabled={isSubmitting}>
                Hủy bỏ
              </Button>
              <Button type="primary" htmlType="submit" loading={isSubmitting}>
                Gửi đề nghị hoàn ứng
              </Button>
            </Flex>
          </Form>
        </div>
      </Modal>

      <CategoryManagementModal
        isOpen={isManageCategoryOpen}
        onClose={() => setIsManageCategoryOpen(false)}
        onCategoriesChanged={async () => {
          const fetched = await fetchCategories();
          if (fetched && fetched.length > 0 && !form.getFieldValue('categoryId')) {
            form.setFieldsValue({
              categoryId: fetched[0].id,
              category: fetched[0].name,
            });
          }
        }}
      />
    </>
  );
};
