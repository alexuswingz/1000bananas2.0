"""
Create Lambda deployment package with all dependencies
"""
import zipfile
import os

def create_deployment_package():
    """Create lambda deployment zip with psycopg2"""
    
    print("=" * 80)
    print("CREATING LAMBDA DEPLOYMENT PACKAGE")
    print("=" * 80)
    print()
    
    zip_filename = 'lambda/lambda_deploy.zip'
    
    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Add main Lambda function
        print("Adding lambda_function.py...")
        zipf.write('lambda/lambda_function.py', 'lambda_function.py')
        
        # Add psycopg2 library
        print("Adding psycopg2 library...")
        psycopg2_path = 'lambda/psycopg2'
        for root, dirs, files in os.walk(psycopg2_path):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, 'lambda')
                zipf.write(file_path, arcname)
                
        # Add psycopg2 binary libs
        print("Adding psycopg2 binary files...")
        binary_paths = [
            'lambda/psycopg2_binary-2.9.11.dist-info',
            'lambda/psycopg2_binary.libs'
        ]
        
        for binary_path in binary_paths:
            if os.path.exists(binary_path):
                for root, dirs, files in os.walk(binary_path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, 'lambda')
                        zipf.write(file_path, arcname)
    
    size_mb = os.path.getsize(zip_filename) / (1024 * 1024)
    print()
    print(f"✅ Deployment package created: {zip_filename}")
    print(f"   Size: {size_mb:.2f} MB")
    print()
    print("=" * 80)
    print("READY TO DEPLOY")
    print("=" * 80)
    print()
    print("Next steps:")
    print("  1. Go to AWS Lambda Console")
    print("  2. Open your main Lambda function (the one in VPC with RDS access)")
    print("  3. Upload lambda_deploy.zip")
    print("  4. Set environment variables:")
    print("     - DB_HOST=bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com")
    print("     - DB_PORT=5432")
    print("     - DB_NAME=postgres")
    print("     - DB_USER=postgres")
    print("     - DB_PASSWORD=postgres")
    print("  5. Test endpoints!")

if __name__ == '__main__':
    create_deployment_package()



