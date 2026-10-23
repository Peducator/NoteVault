'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Table,
  Button,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Popconfirm,
  App,
  Typography,
  Card,
  Flex,
  Divider,
  theme,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CoffeeOutlined,
  CarOutlined,
  ShoppingOutlined,
  CloudServerOutlined,
  TagsOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { categoryApi, CategoryItem } from '../apis/categoryApi';

const { Text, Title } = Typography;

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesChanged?: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  coffee: <CoffeeOutlined />,
  flight: <CarOutlined />,
  shopping: <ShoppingOutlined />,
  cloud: <CloudServerOutlined />,
  server: <CloudServerOutlined />,
  more: <TagsOutlined />,
  default: <FolderOutlined />,
};

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  isOpen,
  onClose,
  onCategoriesChanged,
}) => {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const res = await categoryApi.getCategories();
      if (res.success && Array.isArray(res.data)) {
        setCategories(res.data);
      }
    } catch (err: any) {
      message.error(err.message || 'Không thể tải danh sách danh mục');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      form.resetFields();
      setIsEditing(false);
      setEditingId(null);
    }
  }, [isOpen]);

  const handleOpenCreate = () => {
    form.resetFields();
    form.setFieldsValue({ type: 'EXPENSE', icon: 'default' });
    setEditingId(null);
    setIsEditing(true);
  };

  const handleOpenEdit = (record: CategoryItem) => {
    form.setFieldsValue({
      name: record.name,
      type: (record as any).type || 'EXPENSE',
      icon: record.icon || 'default',
    });
    setEditingId(record.id);
    setIsEditing(true);
  };

  const handleCancelForm = () => {
    setIsEditing(false);
    setEditingId(null);
    form.resetFields();
  };

  const handleFinish = async (values: any) => {
    try {
      setIsSubmitting(true);
      if (editingId) {
        await categoryApi.updateCategory(editingId, {
          name: values.name,
          icon: values.icon,
        });
        message.success('Cập nhật danh mục thành công');
      } else {
        await categoryApi.createCategory({
          name: values.name,
          icon: values.icon,
        });
        message.success('Thêm danh mục chi phí mới thành công');
      }
      setIsEditing(false);
      setEditingId(null);
      form.resetFields();
      await fetchCategories();
      onCategoriesChanged?.();
    } catch (err: any) {
      message.error(err.message || 'Không thể lưu danh mục');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await categoryApi.deleteCategory(id);
      message.success('Đã xóa danh mục');
      await fetchCategories();
      onCategoriesChanged?.();
    } catch (err: any) {
      message.error(err.message || 'Không thể xóa danh mục này');
    }
  };

  const columns = [
    {
      title: 'Biểu tượng',
      dataIndex: 'icon',
      key: 'icon',
      width: 90,
      align: 'center' as const,
      render: (icon: string) => (
        <span style={{ fontSize: 18, color: '#1890ff' }}>
          {ICON_MAP[icon] || <FolderOutlined />}
        </span>
      ),
    },
    {
      title: 'Tên danh mục chi phí',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Phân loại',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) =>
        type === 'INCOME' ? (
          <Tag color="success">Thu nhập</Tag>
        ) : (
          <Tag color="blue">Chi phí</Tag>
        ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      align: 'right' as const,
      render: (_: any, record: CategoryItem) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
          />
          <Popconfirm
            title="Xóa danh mục"
            description="Bạn có chắc muốn xóa danh mục này? (Chỉ xóa được danh mục chưa có giao dịch)"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title={
        <Flex align="center" gap="small">
          <TagsOutlined style={{ color: token.colorPrimary }} />
          <span>Quản Lý Danh Mục Chi Phí Doanh Nghiệp</span>
        </Flex>
      }
      open={isOpen}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
      ]}
      width={680}
      destroyOnHidden
    >
      <Flex vertical gap="middle" style={{ marginTop: 12 }}>
        <Flex justify="space-between" align="center">
          <Text type="secondary" style={{ fontSize: 13 }}>
            Tùy biến các danh mục chi tiêu để AI OCR tự động phân loại và báo cáo tài chính chính xác.
          </Text>
          {!isEditing && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreate}
            >
              Thêm danh mục
            </Button>
          )}
        </Flex>

        {isEditing && (
          <Card
            size="small"
            title={editingId ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
            style={{ borderColor: '#1890ff', background: '#fcfcfc' }}
          >
            <Form form={form} layout="vertical" onFinish={handleFinish}>
              <Flex gap="middle">
                <Form.Item
                  label="Tên danh mục"
                  name="name"
                  rules={[{ required: true, message: 'Vui lòng nhập tên danh mục' }]}
                  style={{ flex: 2 }}
                >
                  <Input placeholder="Ví dụ: Tiếp khách VIP, Quảng cáo online..." />
                </Form.Item>

                <Form.Item label="Biểu tượng" name="icon" style={{ flex: 1 }}>
                  <Select
                    options={[
                      { value: 'coffee', label: '☕ Ăn uống' },
                      { value: 'flight', label: '🚗 Đi lại' },
                      { value: 'shopping', label: '🛍️ Mua sắm' },
                      { value: 'cloud', label: '☁️ Phần mềm' },
                      { value: 'more', label: '🏷️ Khác' },
                      { value: 'default', label: '📁 Mặc định' },
                    ]}
                  />
                </Form.Item>
              </Flex>

              <Flex justify="flex-end" gap="small">
                <Button onClick={handleCancelForm}>Hủy</Button>
                <Button type="primary" htmlType="submit" loading={isSubmitting}>
                  {editingId ? 'Lưu thay đổi' : 'Tạo danh mục'}
                </Button>
              </Flex>
            </Form>
          </Card>
        )}

        <Table
          columns={columns}
          dataSource={categories}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          size="middle"
          bordered
        />
      </Flex>
    </Modal>
  );
};
