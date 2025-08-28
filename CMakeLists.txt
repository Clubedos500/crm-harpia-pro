cmake_minimum_required(VERSION 3.10)
project(NegotiationProcessor)

# Definir o padrão C++
set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Opções de compilação
if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

# Flags de compilação
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall")
set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} -g")
set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -O3")

# Encontrar pacotes necessários
find_package(Threads REQUIRED)

# Incluir diretórios
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)

# Adicionar diretório para bibliotecas de terceiros
add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/third_party/json EXCLUDE_FROM_ALL)

# Adicionar a biblioteca compartilhada
add_library(negotiation_processor SHARED negotiation_processor.cpp)

# Vincular bibliotecas
target_link_libraries(negotiation_processor PRIVATE Threads::Threads nlohmann_json::nlohmann_json)

# Definir propriedades da biblioteca
set_target_properties(negotiation_processor PROPERTIES
    POSITION_INDEPENDENT_CODE ON
    PREFIX ""
)

# Instalar a biblioteca
install(TARGETS negotiation_processor
        LIBRARY DESTINATION ${CMAKE_CURRENT_SOURCE_DIR}/../lib
        RUNTIME DESTINATION ${CMAKE_CURRENT_SOURCE_DIR}/../lib)

# Adicionar executável para testes
add_executable(test_processor negotiation_processor.cpp)
target_compile_definitions(test_processor PRIVATE STANDALONE_TEST)
target_link_libraries(test_processor PRIVATE Threads::Threads nlohmann_json::nlohmann_json)
