import React, { useState, useMemo, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'sonner';
import FormulaTable from './formula/components/FormulaTable';
import FormulaEditor from './formula/components/FormulaEditor';
import formulaApi from '../../services/formulaApi';

const Formula = () => {
  const { isDarkMode } = useTheme();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedFormula, setSelectedFormula] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formulas, setFormulas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
  };

  // Fetch formulas from API
  useEffect(() => {
    const fetchFormulas = async () => {
      try {
        setIsLoading(true);
        const response = await formulaApi.getAll();
        if (response.success && response.data) {
          setFormulas(response.data);
        } else {
          toast.error('Failed to load formulas');
        }
      } catch (error) {
        console.error('Error loading formulas:', error);
        toast.error('Failed to load formulas');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFormulas();
  }, []);

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

  const handleSaveFormula = async (formulaData) => {
    try {
      if (selectedFormula) {
        // Update existing formula
        const response = await formulaApi.update(selectedFormula.id, formulaData);
        if (response.success) {
          setFormulas(prev => prev.map(f => 
            f.id === selectedFormula.id ? { ...f, ...formulaData } : f
          ));
          toast.success('Formula updated successfully!');
        } else {
          toast.error('Failed to update formula');
        }
      } else {
        // Add new formula
        const response = await formulaApi.create(formulaData);
        if (response.success && response.data) {
          setFormulas(prev => [...prev, response.data]);
          toast.success('Formula created successfully!');
        } else {
          toast.error('Failed to create formula');
        }
      }
      setIsEditorOpen(false);
    } catch (error) {
      console.error('Error saving formula:', error);
      toast.error('Failed to save formula');
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen ${themeClasses.bg} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className={isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500'}>Loading formulas...</p>
        </div>
      </div>
    );
  }

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
