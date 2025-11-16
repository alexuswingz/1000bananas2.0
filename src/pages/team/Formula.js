import React, { useState, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'sonner';
import FormulaTable from './formula/components/FormulaTable';
import FormulaEditor from './formula/components/FormulaEditor';

const Formula = () => {
  const { isDarkMode } = useTheme();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedFormula, setSelectedFormula] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
  };

  // Sample data (expanded for pagination)
  const [formulas, setFormulas] = useState([
    { id: 1, account: 'TPS Nutrients', formulaName: 'F.Ultra Grow', brand: 'TPS Plant Foods' },
    { id: 2, account: 'TPS Nutrients', formulaName: 'F.Bloom Boost', brand: 'TPS Plant Foods' },
    { id: 3, account: 'TPS Nutrients', formulaName: 'F.Root Developer', brand: 'TPS Plant Foods' },
    { id: 4, account: 'TPS Nutrients', formulaName: 'F.Flower Power', brand: 'TPS Plant Foods' },
    { id: 5, account: 'Green Earth Co', formulaName: 'F.Organic Mix', brand: 'Nature\'s Choice' },
    { id: 6, account: 'Green Earth Co', formulaName: 'F.Eco Blend', brand: 'Nature\'s Choice' },
    { id: 7, account: 'Garden Masters', formulaName: 'F.Pro Formula', brand: 'ProGrow' },
    { id: 8, account: 'Garden Masters', formulaName: 'F.Advanced Nutrients', brand: 'ProGrow' },
    { id: 9, account: 'TPS Nutrients', formulaName: 'F.Micro Boost', brand: 'TPS Plant Foods' },
    { id: 10, account: 'TPS Nutrients', formulaName: 'F.Macro Plus', brand: 'TPS Plant Foods' },
    { id: 11, account: 'TPS Nutrients', formulaName: 'F.Cal-Mag', brand: 'TPS Plant Foods' },
    { id: 12, account: 'Green Earth Co', formulaName: 'F.Natural Growth', brand: 'Nature\'s Choice' },
  ]);

  const handleNewFormula = () => {
    setSelectedFormula(null);
    setIsEditorOpen(true);
  };

  const handleEditFormula = (formula) => {
    setSelectedFormula(formula);
    setIsEditorOpen(true);
  };

  const handleViewMSDS = (formula) => {
    toast.info(`Viewing MSDS for ${formula.formulaName}`);
  };

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return formulas.slice(startIndex, endIndex);
  }, [formulas, currentPage, pageSize]);

  const totalPages = Math.ceil(formulas.length / pageSize);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const handleSaveFormula = (formulaData) => {
    if (selectedFormula) {
      // Update existing formula
      setFormulas(prev => prev.map(f => 
        f.id === selectedFormula.id ? { ...f, ...formulaData } : f
      ));
      toast.success('Formula updated successfully!');
    } else {
      // Add new formula
      const newFormula = {
        id: formulas.length + 1,
        ...formulaData
      };
      setFormulas(prev => [...prev, newFormula]);
      toast.success('Formula created successfully!');
    }
    setIsEditorOpen(false);
  };

  return (
    <div className={`min-h-screen ${themeClasses.bg} flex flex-col`}>
      <div style={{ flex: 1, padding: '2rem' }}>
        <FormulaTable 
          data={paginatedData}
          totalItems={formulas.length}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onNewFormula={handleNewFormula}
          onEditFormula={handleEditFormula}
          onViewMSDS={handleViewMSDS}
        />
      </div>

      {/* Formula Editor Modal */}
      {isEditorOpen && (
        <FormulaEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleSaveFormula}
          formula={selectedFormula}
        />
      )}
    </div>
  );
};

export default Formula;
