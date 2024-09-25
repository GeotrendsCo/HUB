import pandas as pd
from sqlalchemy import create_engine

# Cargar los datos del archivo Excel
file_path = 'data/datos.csv'


# Conectar a la base de datos PostgreSQL
engine = create_engine('postgresql+psycopg2://dbmasteruser:x|8)]Xu5q6&[^8Ps[OiMDo*NppV5!H1g@ls-ef6cea836d847f09c85f3d354ae9db50bd1912c5.c1a60uoi6neh.us-east-1.rds.amazonaws.com:5432/PDB_USB')
# Cargar los datos del archivo CSV
# Cargar los datos del archivo CSV usando el separador correcto (;)
df = pd.read_csv(file_path, sep=';', on_bad_lines='skip', low_memory=False)

# Limpiar los nombres de las columnas eliminando espacios en blanco
df.columns = df.columns.str.strip()
# Imprimir los nombres de las columnas
print(df.columns)



# Limpiar y transformar los datos (separar en tablas)

# Tabla productos_padres
productos_padres_df = df[['CODIGO PADRE', 'ALCANCE ARTICULADOR/PRODUCTO PADRE', 'DESCRIPCIÓN PRODUCTO PADRE']].drop_duplicates()
productos_padres_df.columns = ['codigo_padre', 'nombre_articulador_producto', 'descripcion_producto']

# Tabla proyectos_estrategicos
proyectos_estrategicos_df = df[['CODIGO PROYECTO', 'PROYECTOS ESTRATEGICOS', 'OBJETIVO PROYECTOS ESTRATEGICOS', 'CODIGO PADRE']].drop_duplicates()
proyectos_estrategicos_df.columns = ['codigo_proyecto', 'nombre_proyecto', 'objetivo_proyecto', 'producto_padre']

# Tabla microproyectos
microproyectos_df = df[['CÓDIGO MICROPROYECTO', 'MICROPROYECTOS_ASOCIADOS', 'OBJETIVO MICROPROYECTOS', 'Horizontes', 'Activo 2024-1', 'Inactivo 2024-1', 'EQUIPO', 'LIDER', 'CODIGO PROYECTO']].drop_duplicates()
microproyectos_df.columns = ['codigo_microproyecto', 'nombre_microproyecto', 'objetivo_microproyecto', 'horizonte', 'activo', 'inactivo', 'equipo', 'lider', 'proyecto_asociado']

# Convertir las columnas de activo/inactivo a booleanos
microproyectos_df['activo'] = microproyectos_df['activo'].apply(lambda x: True if x == 'x' else False)
microproyectos_df['inactivo'] = microproyectos_df['inactivo'].apply(lambda x: True if x == 'X' else False)

# Insertar los datos en las tablas correspondientes de PostgreSQL
#productos_padres_df.to_sql('productos_padres', engine, if_exists='append', index=False)
#proyectos_estrategicos_df.to_sql('proyectos_estrategicos', engine, if_exists='append', index=False)
microproyectos_df.to_sql('microproyectos', engine, if_exists='append', index=False)

print("Datos insertados correctamente en la base de datos.")