"""
Import all JSON database files into SQLite with proper foreign key relationships
"""

import sqlite3
import json
import os
from datetime import datetime

# Database file path
DB_FILE = 'database.db'
JSON_DIR = 'json_exports'

def connect_db():
    """Create database connection with foreign keys enabled"""
    conn = sqlite3.connect(DB_FILE)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def create_database():
    """Create database schema from SQL file"""
    print("[INFO] Creating database schema...")
    
    conn = connect_db()
    cursor = conn.cursor()
    
    # Read and execute schema
    with open('database_schema.sql', 'r', encoding='utf-8') as f:
        schema_sql = f.read()
        cursor.executescript(schema_sql)
    
    conn.commit()
    conn.close()
    print("[OK] Database schema created successfully\n")

def load_json(filename):
    """Load JSON file from exports directory"""
    filepath = os.path.join(JSON_DIR, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def import_brands():
    """Import Brand Database"""
    print("[INFO] Importing Brand Database...")
    
    brands = load_json('brand_database_clean.json')
    conn = connect_db()
    cursor = conn.cursor()
    
    for brand in brands:
        cursor.execute("""
            INSERT INTO brand (brand_name, brand_address, brand_website, brand_email)
            VALUES (?, ?, ?, ?)
        """, (
            brand.get('entity'),  # JSON uses 'entity' not 'brand_name'
            brand.get('address'),  # JSON uses 'address' not 'brand_address'
            brand.get('website'),  # JSON uses 'website' not 'brand_website'
            brand.get('email')     # JSON uses 'email' not 'brand_email'
        ))
    
    conn.commit()
    conn.close()
    print(f"[OK] Imported {len(brands)} brands\n")

def import_kits():
    """Import Kit Database"""
    print("[INFO] Importing Kit Database...")
    
    kits = load_json('kit_database_clean.json')
    conn = connect_db()
    cursor = conn.cursor()
    
    for kit in kits:
        cursor.execute("""
            INSERT INTO kit (
                category, packaging_name, box_size, units_per_case,
                box_weight_lbs, boxes_per_pallet, length_in, width_in,
                height_in, weight_lbs
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            kit.get('category'),
            kit.get('packaging_name'),
            kit.get('box_size'),
            kit.get('units_per_case'),
            kit.get('box_weight_lbs'),
            kit.get('boxes_per_pallet'),
            kit.get('length_in'),
            kit.get('width_in'),
            kit.get('height_in'),
            kit.get('weight_lbs')
        ))
    
    conn.commit()
    conn.close()
    print(f"[OK] Imported {len(kits)} kits\n")

def import_bags():
    """Import Bag Database"""
    print("[INFO] Importing Bag Database...")
    
    bags = load_json('bag_database_clean.json')
    conn = connect_db()
    cursor = conn.cursor()
    
    for bag in bags:
        cursor.execute("""
            INSERT INTO bag (
                category, packaging_name, box_size, units_per_case,
                box_weight_lbs, boxes_per_pallet, length_in, width_in,
                height_in, weight_lbs
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            bag.get('category'),
            bag.get('packaging_name'),
            bag.get('box_size'),
            bag.get('units_per_case'),
            bag.get('box_weight_lbs'),
            bag.get('boxes_per_pallet'),
            bag.get('length_in'),
            bag.get('width_in'),
            bag.get('height_in'),
            bag.get('weight_lbs')
        ))
    
    conn.commit()
    conn.close()
    print(f"[OK] Imported {len(bags)} bags\n")

def import_closures():
    """Import Closure Database"""
    print("[INFO] Importing Closure Database...")
    
    closures = load_json('closure_database_clean.json')
    conn = connect_db()
    cursor = conn.cursor()
    
    for closure in closures:
        cursor.execute("""
            INSERT INTO closure (
                category, closure_name, closure_supplier, closure_part_number,
                closure_description, lead_time_weeks, moq, units_per_pallet,
                units_per_case, cases_per_pallet
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            closure.get('category'),
            closure.get('closure_name'),
            closure.get('closure_supplier'),
            closure.get('closure_part_number'),
            closure.get('closure_description'),
            closure.get('lead_time_weeks'),
            closure.get('moq'),
            closure.get('units_per_pallet'),
            closure.get('units_per_case'),
            closure.get('cases_per_pallet')
        ))
    
    conn.commit()
    conn.close()
    print(f"[OK] Imported {len(closures)} closures\n")

def import_finished_goods():
    """Import Finished Goods Database"""
    print("[INFO] Importing Finished Goods Database...")
    
    finished_goods = load_json('finished_goods_database_clean.json')
    conn = connect_db()
    cursor = conn.cursor()
    
    for fg in finished_goods:
        cursor.execute("""
            INSERT INTO finished_goods (
                finished_good_name, box_size, units_per_case, units_per_gallon,
                box_weight_lbs, boxes_per_pallet, single_box_pallet_share,
                replenishment_strategy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            fg.get('packaging_name'),  # JSON uses 'packaging_name' not 'finished_good_name'
            fg.get('box_size'),
            fg.get('units_per_case'),
            fg.get('units_per_gallon'),
            fg.get('box_weight_lbs'),
            fg.get('boxes_per_pallet'),
            fg.get('single_box_pallet_share'),
            fg.get('replenishment_strategy')
        ))
    
    conn.commit()
    conn.close()
    print(f"[OK] Imported {len(finished_goods)} finished goods\n")

def import_bottles():
    """Import Bottle Database with sectioned data"""
    print("[INFO] Importing Bottle Database...")
    
    bottles = load_json('bottle_database_clean.json')
    conn = connect_db()
    cursor = conn.cursor()
    
    for bottle in bottles:
        core = bottle.get('core_data', {})
        supplier = bottle.get('supplier_info', {})
        fg = bottle.get('finished_goods', {})
        dims = bottle.get('dimensions', {})
        inv = bottle.get('inventory', {})
        
        cursor.execute("""
            INSERT INTO bottle (
                bottle_name, bottle_image, size_oz, shape, color, thread_type,
                cap_size, material, supplier, packaging_part_number, description,
                brand, lead_time_weeks, moq, units_per_pallet, units_per_case,
                cases_per_pallet, box_size, finished_units_per_case, units_per_gallon,
                box_weight_lbs, boxes_per_pallet, single_box_pallet_share,
                replenishment_strategy, length_in, width_in, height_in, weight_lbs,
                label_size, supplier_order_strategy, supplier_inventory,
                warehouse_inventory, max_warehouse_inventory
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
                     ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            core.get('bottle_name'),
            core.get('bottle_image'),
            core.get('size_oz'),
            core.get('shape'),
            core.get('color'),
            core.get('thread_type'),
            core.get('cap_size'),
            core.get('material'),
            core.get('supplier'),
            core.get('packaging_part_number'),
            core.get('description'),
            core.get('brand'),
            supplier.get('lead_time_weeks'),
            supplier.get('moq'),
            supplier.get('units_per_pallet'),
            supplier.get('units_per_case'),
            supplier.get('cases_per_pallet'),
            fg.get('box_size'),
            fg.get('units_per_case'),
            fg.get('units_per_gallon'),
            fg.get('box_weight_lbs'),
            fg.get('boxes_per_pallet'),
            fg.get('single_box_pallet_share'),
            fg.get('replenishment_strategy'),
            dims.get('length_in'),
            dims.get('width_in'),
            dims.get('height_in'),
            dims.get('weight_lbs'),
            dims.get('label_size'),
            inv.get('supplier_order_strategy'),
            inv.get('supplier_inventory'),
            inv.get('warehouse_inventory'),
            inv.get('max_warehouse_inventory')
        ))
    
    conn.commit()
    conn.close()
    print(f"[OK] Imported {len(bottles)} bottles\n")

def import_formulas():
    """Import Formula Database"""
    print("[INFO] Importing Formula Database...")
    
    formulas = load_json('formula_database_clean.json')
    conn = connect_db()
    cursor = conn.cursor()
    
    for formula in formulas:
        cursor.execute("""
            INSERT INTO formula (
                formula, guaranteed_analysis, npk, derived_from,
                storage_warranty_precautionary_metals, filler,
                tps_guaranteed_analysis, tps_npk, tps_derived_from,
                tps_storage_warranty_precautionary_metals
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            formula.get('formula'),
            formula.get('guaranteed_analysis'),
            formula.get('npk'),
            formula.get('derived_from'),
            formula.get('storage_warranty_precautionary_metals'),
            formula.get('filler'),
            formula.get('tps_guaranteed_analysis'),
            formula.get('tps_npk'),
            formula.get('tps_derived_from'),
            formula.get('tps_storage_warranty_precautionary_metals')
        ))
    
    conn.commit()
    conn.close()
    print(f"[OK] Imported {len(formulas)} formulas\n")

def import_catalog():
    """Import Catalog Database with foreign key relationships"""
    print("[INFO] Importing Catalog Database (this may take a minute)...")
    
    catalog = load_json('catalog_database_clean.json')
    conn = connect_db()
    cursor = conn.cursor()
    
    imported = 0
    skipped = 0
    
    for product in catalog:
        try:
            # Extract sections
            product_images = product.get('product_images', {})
            core_info = product.get('core_product_info', {})
            packaging = product.get('packaging', {})
            formula = product.get('formula', {})
            marketing = product.get('marketing', {})
            notes = product.get('notes', {})
            label = product.get('label', {})
            tps_label = product.get('tps_label_copy', {})
            slides = product.get('slides', {})
            a_plus = product.get('a+', {})
            website = product.get('website', {})
            listing_setup = product.get('listing_setup', {})
            price_section = product.get('price', {})
            listing_copy = product.get('listing_copy', {})
            vine = product.get('vine', {})
            
            # Parse dates
            date_added = core_info.get('Date Added')
            if date_added and 'T' in str(date_added):
                date_added = date_added.split('T')[0]
            
            vine_launch_date = vine.get('Vine Launch Date')
            if vine_launch_date and 'T' in str(vine_launch_date):
                vine_launch_date = vine_launch_date.split('T')[0]
            
            cursor.execute("""
                INSERT INTO catalog (
                    product_image_url, basic_wrap_url, plant_behind_product_url, tri_bottle_wrap_url,
                    date_added, marketplace, seller_account, country, brand_name, product_name, size, type,
                    packaging_name, closure_name, label_size, label_location, case_size, units_per_case,
                    filter, upc, upc_image_file, parent_asin, child_asin, parent_sku_final, child_sku_final,
                    formula_name, msds, guaranteed_analysis, npk, derived_from, 
                    storage_warranty_precautionary_metals, units_sold_30_days, vine_notes, brand_tailor_discount,
                    core_competitor_asins, other_competitor_asins, core_keywords, other_keywords,
                    notes, stock_image, label_ai_file, label_print_ready_pdf,
                    tps_left_side_benefit_graphic, tps_directions, tps_growing_recommendations,
                    qr_code_section, website, product_title, center_benefit_statement,
                    size_copy_for_label, right_side_benefit_graphic, ingredient_statement,
                    tps_guaranteed_analysis, tps_npk, tps_derived_from, 
                    tps_storage_warranty_precautionary_metals, tps_address,
                    amazon_slide_1, amazon_slide_2, amazon_slide_3, amazon_slide_4,
                    amazon_slide_5, amazon_slide_6, amazon_slide_7,
                    amazon_a_plus_slide_1, amazon_a_plus_slide_2, amazon_a_plus_slide_3,
                    amazon_a_plus_slide_4, amazon_a_plus_slide_5, amazon_a_plus_slide_6,
                    tbd, product_dimensions_length_in, product_dimensions_width_in,
                    product_dimensions_height_in, product_dimensions_weight_lbs,
                    six_sided_image_front, six_sided_image_left, six_sided_image_back,
                    six_sided_image_right, six_sided_image_top, six_sided_image_bottom,
                    price, title, bullets, description,
                    vine_status, vine_launch_date, units_enrolled, vine_reviews, star_rating, vine_program_notes
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
            """, (
                product_images.get('Product Images'),
                product_images.get('Basic Wrap'),
                product_images.get('Plant Behind Product'),
                product_images.get('Tri-Bottle Wrap'),
                date_added,
                core_info.get('Marketplace'),
                core_info.get('Seller Account'),
                core_info.get('Country'),
                core_info.get('Brand Name'),
                core_info.get('Product Name'),
                core_info.get('Size'),
                core_info.get('Type'),
                packaging.get('Packaging Name'),
                packaging.get('Closure Name'),
                packaging.get('Label Size'),
                packaging.get('Label Location'),
                packaging.get('Case Size'),
                packaging.get('Units per Case'),
                packaging.get('Filter'),
                packaging.get('UPC'),
                packaging.get('UPC Image File'),
                packaging.get('Parent ASIN'),
                packaging.get('Child ASIN'),
                packaging.get('PARENT SKU FINAL'),
                packaging.get('CHILD SKU FINAL'),
                formula.get('Formula Name'),
                formula.get('MSDS'),
                formula.get('Guaranteed Analysis'),
                formula.get('NPK'),
                formula.get('Derived From'),
                formula.get('Storage / Warranty / Precautionary / Metals'),
                formula.get('Units Sold 30 Days'),
                formula.get('Vine Notes'),
                formula.get('Brand Tailor Discount'),
                marketing.get('Core Competitor ASINS'),
                marketing.get('Other Competitor ASINS'),
                marketing.get('Core Keywords'),
                marketing.get('Other Keywords'),
                notes.get('Notes'),
                label.get('Stock Image'),
                label.get('LABEL:  AI FILE'),
                label.get('LABEL: PRINT READY PDF'),
                tps_label.get('TPS Plant Foods  Left Side Benefit Graphic'),
                tps_label.get('TPS Plant Foods Directions'),
                tps_label.get('TPS Plant Foods Growing Recommendations'),
                tps_label.get('QR Code Section'),
                tps_label.get('WEBSITE'),
                tps_label.get('Product Title'),
                tps_label.get('Center Benefit Statement'),
                tps_label.get('Size Copy for Label'),
                tps_label.get('Right Side Benefit Graphic'),
                tps_label.get('INGREDIENT STATEMENT'),
                tps_label.get('TPS GUARANTEED ANALYSIS'),
                tps_label.get('TPS NPK'),
                tps_label.get('TPS DERIVED FROM'),
                tps_label.get('TPS STORAGE / WARRANTY / PRECAUTIONARY / METALS'),
                tps_label.get('TPS Address'),
                slides.get('Amazon Slide #1'),
                slides.get('Amazon Slide #2'),
                slides.get('Amazon Slide #3'),
                slides.get('Amazon Slide #4'),
                slides.get('Amazon Slide #5'),
                slides.get('Amazon Slide #6'),
                slides.get('Amazon Slide #7'),
                a_plus.get('Amazon A+ Slide #1'),
                a_plus.get('Amazon A+ Slide #2'),
                a_plus.get('Amazon A+ Slide #3'),
                a_plus.get('Amazon A+ Slide #4'),
                a_plus.get('Amazon A+ Slide #5'),
                a_plus.get('Amazon A+ Slide #6'),
                website.get('TBD'),
                listing_setup.get('Product Dimensions Length (in)'),
                listing_setup.get('Product Dimensions Width (in)'),
                listing_setup.get('Product Dimensions Height (in)'),
                listing_setup.get('Product Dimensions Weight (lbs)'),
                listing_setup.get('6 Sided Image Front'),
                listing_setup.get('6 Sided Image Left'),
                listing_setup.get('6 Sided Image Back'),
                listing_setup.get('6 Sided Image Right'),
                listing_setup.get('6 Sided Image Top'),
                listing_setup.get('6 Sided Image Bottom'),
                price_section.get('Price'),
                listing_copy.get('Title'),
                listing_copy.get('Bullets'),
                listing_copy.get('Description'),
                vine.get('Status'),
                vine_launch_date,
                vine.get('Units Enrolled'),
                vine.get('Vine Reviews'),
                vine.get('Star Rating'),
                vine.get('Notes')
            ))
            
            imported += 1
            
            # Progress indicator
            if imported % 100 == 0:
                print(f"  [{imported}/{len(catalog)}] products imported...")
                conn.commit()
        
        except Exception as e:
            skipped += 1
            print(f"  [WARNING] Skipped product {product.get('id')}: {str(e)}")
    
    conn.commit()
    conn.close()
    print(f"[OK] Imported {imported} products ({skipped} skipped)\n")

def verify_database():
    """Verify the import and show statistics"""
    print("="*80)
    print("DATABASE IMPORT VERIFICATION")
    print("="*80)
    
    conn = connect_db()
    cursor = conn.cursor()
    
    tables = ['brand', 'kit', 'bag', 'closure', 'finished_goods', 'bottle', 'formula', 'catalog']
    
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"{table.upper():20} {count:6} records")
    
    print("="*80)
    
    # Verify foreign key relationships
    print("\nFOREIGN KEY VERIFICATION:")
    print("-"*80)
    
    # Check catalog -> bottle relationship
    cursor.execute("""
        SELECT COUNT(*) FROM catalog 
        WHERE packaging_name IS NOT NULL 
        AND packaging_name NOT IN (SELECT bottle_name FROM bottle)
    """)
    orphaned_bottles = cursor.fetchone()[0]
    print(f"Orphaned bottle references:  {orphaned_bottles}")
    
    # Check catalog -> formula relationship
    cursor.execute("""
        SELECT COUNT(*) FROM catalog 
        WHERE formula_name IS NOT NULL 
        AND formula_name NOT IN (SELECT formula FROM formula)
    """)
    orphaned_formulas = cursor.fetchone()[0]
    print(f"Orphaned formula references: {orphaned_formulas}")
    
    # Check catalog -> brand relationship
    cursor.execute("""
        SELECT COUNT(*) FROM catalog 
        WHERE brand_name IS NOT NULL 
        AND brand_name NOT IN (SELECT brand_name FROM brand)
    """)
    orphaned_brands = cursor.fetchone()[0]
    print(f"Orphaned brand references:   {orphaned_brands}")
    
    # Check catalog -> closure relationship
    cursor.execute("""
        SELECT COUNT(*) FROM catalog 
        WHERE closure_name IS NOT NULL 
        AND closure_name NOT IN (SELECT closure_name FROM closure)
    """)
    orphaned_closures = cursor.fetchone()[0]
    print(f"Orphaned closure references: {orphaned_closures}")
    
    print("="*80)
    
    conn.close()

def main():
    """Main import process"""
    print("="*80)
    print("1000 BANANAS DATABASE IMPORT")
    print("="*80)
    print()
    
    # Delete existing database if it exists
    if os.path.exists(DB_FILE):
        print(f"[INFO] Removing existing database: {DB_FILE}")
        os.remove(DB_FILE)
        print()
    
    # Create database schema
    create_database()
    
    # Import reference tables first (no foreign key dependencies)
    import_brands()
    import_kits()
    import_bags()
    import_closures()
    import_finished_goods()
    import_bottles()
    import_formulas()
    
    # Import catalog last (has foreign key dependencies)
    import_catalog()
    
    # Verify the import
    verify_database()
    
    print()
    print("[SUCCESS] Database import complete!")
    print(f"[INFO] Database file: {DB_FILE}")
    print()

if __name__ == '__main__':
    main()

