import { ServiceCategory } from '../types';

export function mapServiceCategory(
  slug?: string | null,
  name?: string | null,
): ServiceCategory {
  const value = `${slug || ''} ${name || ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[-_]+/g, ' ')
    .toLowerCase();

  if (value.includes('sua khoa') || value.includes('lock')) return 'Locksmith';
  if (
    value.includes('do gia dung') ||
    value.includes('home appliance') ||
    value.includes('may giat') ||
    value.includes('washing machine') ||
    value.includes('gia dung')
  ) return 'HomeAppliance';
  if (value.includes('diet con trung') || value.includes('pest') || value.includes('con trung')) return 'PestControl';
  if (value.includes('son sua nha') || value.includes('painting') || value.includes('paint')) return 'Painting';
  if (
    value.includes('dien lanh') ||
    value.includes('air condition') ||
    value.includes('refrigerat') ||
    value.includes('may lanh') ||
    value.includes('dieu hoa')
  ) return 'Appliance';
  if (value.includes('dien nuoc') || value.includes('plumb') || value.includes('water') || value.includes('nuoc')) return 'Plumbing';
  if (value.includes('sua dien') || value.includes('dien dan dung') || value.includes('electric')) return 'Electrical';
  if (value.includes('don dep') || value.includes('clean')) return 'Cleaning';

  if (
    name === 'Cleaning' ||
    name === 'Electrical' ||
    name === 'Plumbing' ||
    name === 'Appliance' ||
    name === 'Painting' ||
    name === 'Locksmith' ||
    name === 'HomeAppliance' ||
    name === 'PestControl'
  ) {
    return name;
  }
  return 'Cleaning';
}
