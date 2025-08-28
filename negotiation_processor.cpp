#include <iostream>
#include <vector>
#include <string>
#include <map>
#include <chrono>
#include <thread>
#include <mutex>
#include <fstream>
#include <sstream>
#include <algorithm>
#include <cmath>
#include <nlohmann/json.hpp>

// Para simplificar o uso do namespace json
using json = nlohmann::json;

// Classe para cronômetro de alta precisão
class PrecisionTimer {
private:
    std::chrono::time_point<std::chrono::high_resolution_clock> start_time;
    std::chrono::time_point<std::chrono::high_resolution_clock> end_time;
    bool running;

public:
    PrecisionTimer() : running(false) {}

    void start() {
        start_time = std::chrono::high_resolution_clock::now();
        running = true;
    }

    void stop() {
        end_time = std::chrono::high_resolution_clock::now();
        running = false;
    }

    // Retorna o tempo decorrido em milissegundos
    double elapsed_ms() {
        auto end = running ? std::chrono::high_resolution_clock::now() : end_time;
        return std::chrono::duration<double, std::milli>(end - start_time).count();
    }

    // Retorna o tempo decorrido em segundos
    double elapsed_seconds() {
        return elapsed_ms() / 1000.0;
    }
};

// Classe para análise de texto em negociações
class TextAnalyzer {
private:
    std::vector<std::string> positive_words;
    std::vector<std::string> negative_words;
    std::vector<std::string> power_words;
    std::vector<std::string> collaborative_words;

    // Carrega palavras de um arquivo
    void load_words_from_file(const std::string& filename, std::vector<std::string>& word_list) {
        std::ifstream file(filename);
        std::string word;
        
        if (file.is_open()) {
            while (std::getline(file, word)) {
                // Converter para minúsculas
                std::transform(word.begin(), word.end(), word.begin(),
                    [](unsigned char c) { return std::tolower(c); });
                word_list.push_back(word);
            }
            file.close();
        }
    }

    // Normaliza o texto para análise
    std::string normalize_text(const std::string& text) {
        std::string result = text;
        // Converter para minúsculas
        std::transform(result.begin(), result.end(), result.begin(),
            [](unsigned char c) { return std::tolower(c); });
        return result;
    }

    // Conta ocorrências de palavras de uma lista no texto
    int count_word_occurrences(const std::string& text, const std::vector<std::string>& word_list) {
        int count = 0;
        std::string normalized_text = normalize_text(text);
        
        for (const auto& word : word_list) {
            size_t pos = 0;
            while ((pos = normalized_text.find(word, pos)) != std::string::npos) {
                // Verificar se é uma palavra completa
                bool is_word_start = (pos == 0 || !std::isalpha(normalized_text[pos-1]));
                bool is_word_end = (pos + word.length() == normalized_text.length() || 
                                  !std::isalpha(normalized_text[pos + word.length()]));
                
                if (is_word_start && is_word_end) {
                    count++;
                }
                pos += word.length();
            }
        }
        
        return count;
    }

public:
    TextAnalyzer() {
        // Inicializar com algumas palavras padrão
        // Em uma implementação real, estas seriam carregadas de arquivos
        positive_words = {"acordo", "benefício", "colaboração", "ganho", "oportunidade", 
                         "parceria", "solução", "sucesso", "vantagem", "valor"};
        
        negative_words = {"conflito", "custo", "desvantagem", "disputa", "falha", 
                         "perda", "problema", "risco", "ruptura", "tensão"};
        
        power_words = {"certamente", "claramente", "definitivamente", "essencial", "exatamente", 
                      "garantido", "imperativo", "necessário", "precisamente", "vital"};
        
        collaborative_words = {"ambos", "compartilhar", "conjunto", "cooperação", "equipe", 
                             "juntos", "mútuo", "parceria", "reciprocidade", "sinergia"};
    }

    // Carrega palavras de arquivos externos
    void load_word_lists(const std::string& positive_file, const std::string& negative_file,
                        const std::string& power_file, const std::string& collaborative_file) {
        load_words_from_file(positive_file, positive_words);
        load_words_from_file(negative_file, negative_words);
        load_words_from_file(power_file, power_words);
        load_words_from_file(collaborative_file, collaborative_words);
    }

    // Analisa um texto e retorna métricas
    json analyze_text(const std::string& text) {
        json result;
        
        // Contar ocorrências de cada tipo de palavra
        int positive_count = count_word_occurrences(text, positive_words);
        int negative_count = count_word_occurrences(text, negative_words);
        int power_count = count_word_occurrences(text, power_words);
        int collaborative_count = count_word_occurrences(text, collaborative_words);
        
        // Calcular total de palavras no texto
        std::istringstream iss(text);
        int word_count = std::distance(std::istream_iterator<std::string>(iss),
                                     std::istream_iterator<std::string>());
        
        // Calcular percentuais
        double positive_ratio = word_count > 0 ? (double)positive_count / word_count : 0;
        double negative_ratio = word_count > 0 ? (double)negative_count / word_count : 0;
        double power_ratio = word_count > 0 ? (double)power_count / word_count : 0;
        double collaborative_ratio = word_count > 0 ? (double)collaborative_count / word_count : 0;
        
        // Calcular pontuação de tom (positivo vs negativo)
        double tone_score = 0;
        if (positive_count + negative_count > 0) {
            tone_score = (double)(positive_count - negative_count) / (positive_count + negative_count);
        }
        
        // Calcular pontuação de estilo (poder vs colaboração)
        double style_score = 0;
        if (power_count + collaborative_count > 0) {
            style_score = (double)(collaborative_count - power_count) / (power_count + collaborative_count);
        }
        
        // Preencher o resultado JSON
        result["word_count"] = word_count;
        result["metrics"] = {
            {"positive_words", positive_count},
            {"negative_words", negative_count},
            {"power_words", power_count},
            {"collaborative_words", collaborative_count},
            {"positive_ratio", positive_ratio},
            {"negative_ratio", negative_ratio},
            {"power_ratio", power_ratio},
            {"collaborative_ratio", collaborative_ratio},
            {"tone_score", tone_score},  // -1 (muito negativo) a 1 (muito positivo)
            {"style_score", style_score}  // -1 (muito autoritário) a 1 (muito colaborativo)
        };
        
        return result;
    }
};

// Classe para análise de performance em exercícios de negociação
class PerformanceAnalyzer {
private:
    // Armazena histórico de tempos por exercício
    std::map<std::string, std::vector<double>> exercise_times;
    std::mutex data_mutex;

public:
    // Registra o tempo de um exercício
    void record_exercise_time(const std::string& exercise_id, double time_seconds) {
        std::lock_guard<std::mutex> lock(data_mutex);
        exercise_times[exercise_id].push_back(time_seconds);
    }

    // Calcula estatísticas para um exercício específico
    json get_exercise_stats(const std::string& exercise_id) {
        std::lock_guard<std::mutex> lock(data_mutex);
        json result;
        
        if (exercise_times.find(exercise_id) == exercise_times.end() || 
            exercise_times[exercise_id].empty()) {
            result["status"] = "no_data";
            return result;
        }
        
        const auto& times = exercise_times[exercise_id];
        
        // Calcular média
        double sum = std::accumulate(times.begin(), times.end(), 0.0);
        double mean = sum / times.size();
        
        // Calcular mínimo e máximo
        double min_time = *std::min_element(times.begin(), times.end());
        double max_time = *std::max_element(times.begin(), times.end());
        
        // Calcular desvio padrão
        double sq_sum = std::inner_product(times.begin(), times.end(), times.begin(), 0.0,
                                         std::plus<>(), [mean](double x, double y) {
                                             return (x - mean) * (y - mean);
                                         });
        double std_dev = std::sqrt(sq_sum / times.size());
        
        // Calcular tendência (melhoria ao longo do tempo)
        double trend = 0.0;
        if (times.size() >= 2) {
            // Simplificação: comparar primeira e última tentativa
            trend = times.front() - times.back();
        }
        
        // Preencher o resultado JSON
        result["status"] = "success";
        result["count"] = times.size();
        result["stats"] = {
            {"mean", mean},
            {"min", min_time},
            {"max", max_time},
            {"std_dev", std_dev},
            {"trend", trend}  // Positivo indica melhoria (tempo menor)
        };
        
        return result;
    }

    // Obtém estatísticas para todos os exercícios
    json get_all_stats() {
        std::lock_guard<std::mutex> lock(data_mutex);
        json result;
        
        for (const auto& pair : exercise_times) {
            result[pair.first] = get_exercise_stats(pair.first);
        }
        
        return result;
    }

    // Limpa os dados de um exercício específico
    void clear_exercise_data(const std::string& exercise_id) {
        std::lock_guard<std::mutex> lock(data_mutex);
        if (exercise_times.find(exercise_id) != exercise_times.end()) {
            exercise_times[exercise_id].clear();
        }
    }

    // Salva os dados em um arquivo JSON
    bool save_data(const std::string& filename) {
        std::lock_guard<std::mutex> lock(data_mutex);
        json data;
        
        for (const auto& pair : exercise_times) {
            data[pair.first] = pair.second;
        }
        
        std::ofstream file(filename);
        if (file.is_open()) {
            file << data.dump(4);  // Indentação de 4 espaços
            file.close();
            return true;
        }
        
        return false;
    }

    // Carrega os dados de um arquivo JSON
    bool load_data(const std::string& filename) {
        std::lock_guard<std::mutex> lock(data_mutex);
        std::ifstream file(filename);
        
        if (file.is_open()) {
            try {
                json data = json::parse(file);
                file.close();
                
                for (auto it = data.begin(); it != data.end(); ++it) {
                    std::string exercise_id = it.key();
                    exercise_times[exercise_id] = it.value().get<std::vector<double>>();
                }
                
                return true;
            } catch (const std::exception& e) {
                std::cerr << "Erro ao carregar dados: " << e.what() << std::endl;
                file.close();
                return false;
            }
        }
        
        return false;
    }
};

// Classe para análise de padrões em negociações
class NegotiationPatternAnalyzer {
private:
    // Mapeia padrões de negociação para suas descrições
    std::map<std::string, std::string> pattern_descriptions;

public:
    NegotiationPatternAnalyzer() {
        // Inicializar com alguns padrões comuns
        pattern_descriptions["anchoring"] = "Uso de âncora inicial extrema para influenciar percepção de valor";
        pattern_descriptions["nibbling"] = "Pedidos pequenos adicionais após acordo principal";
        pattern_descriptions["good_cop_bad_cop"] = "Alternância entre posições duras e conciliatórias";
        pattern_descriptions["deadline_pressure"] = "Uso de prazos para forçar concessões";
        pattern_descriptions["limited_authority"] = "Alegação de autoridade limitada para decisão";
        pattern_descriptions["emotional_appeal"] = "Uso de apelos emocionais para influenciar decisões";
        pattern_descriptions["take_it_or_leave_it"] = "Apresentação de proposta final sem negociação";
        pattern_descriptions["bogey"] = "Fingir que um item tem pouco valor quando na verdade é importante";
        pattern_descriptions["decoy"] = "Introdução de opção irrelevante para tornar outra mais atraente";
        pattern_descriptions["highball_lowball"] = "Oferta inicial extrema seguida de concessões planejadas";
    }

    // Adiciona um novo padrão ao analisador
    void add_pattern(const std::string& pattern_id, const std::string& description) {
        pattern_descriptions[pattern_id] = description;
    }

    // Obtém a descrição de um padrão específico
    std::string get_pattern_description(const std::string& pattern_id) {
        if (pattern_descriptions.find(pattern_id) != pattern_descriptions.end()) {
            return pattern_descriptions[pattern_id];
        }
        return "Padrão desconhecido";
    }

    // Analisa um texto em busca de padrões de negociação
    json analyze_patterns(const std::string& text) {
        json result;
        std::map<std::string, double> pattern_scores;
        
        // Palavras-chave associadas a cada padrão
        std::map<std::string, std::vector<std::string>> pattern_keywords = {
            {"anchoring", {"inicial", "oferta", "valor", "mercado", "comparável", "referência"}},
            {"nibbling", {"adicional", "pequeno", "mais um", "também", "incluir", "além disso"}},
            {"good_cop_bad_cop", {"colega", "consultar", "superior", "flexível", "rígido"}},
            {"deadline_pressure", {"prazo", "tempo", "urgente", "amanhã", "hoje", "imediato"}},
            {"limited_authority", {"autorização", "superior", "consultar", "permissão", "limitado"}},
            {"emotional_appeal", {"sentir", "família", "difícil", "situação", "ajuda", "empatia"}},
            {"take_it_or_leave_it", {"final", "última", "melhor", "impossível", "única", "opção"}},
            {"bogey", {"importância", "relevante", "secundário", "prioridade", "valor"}},
            {"decoy", {"alternativa", "opção", "comparar", "escolha", "preferência"}},
            {"highball_lowball", {"inicial", "reduzir", "ajustar", "flexibilidade", "reconsiderar"}}
        };
        
        // Normalizar o texto
        std::string normalized_text = text;
        std::transform(normalized_text.begin(), normalized_text.end(), normalized_text.begin(),
            [](unsigned char c) { return std::tolower(c); });
        
        // Analisar cada padrão
        for (const auto& pattern : pattern_keywords) {
            int keyword_count = 0;
            
            // Contar ocorrências de palavras-chave
            for (const auto& keyword : pattern.second) {
                size_t pos = 0;
                while ((pos = normalized_text.find(keyword, pos)) != std::string::npos) {
                    keyword_count++;
                    pos += keyword.length();
                }
            }
            
            // Calcular pontuação baseada na frequência de palavras-chave
            double score = 0.0;
            if (!pattern.second.empty()) {
                score = (double)keyword_count / pattern.second.size();
            }
            
            pattern_scores[pattern.first] = score;
        }
        
        // Identificar os padrões mais prováveis (pontuação > 0.3)
        json detected_patterns = json::array();
        for (const auto& score : pattern_scores) {
            if (score.second > 0.3) {
                detected_patterns.push_back({
                    {"pattern_id", score.first},
                    {"description", pattern_descriptions[score.first]},
                    {"confidence", score.second}
                });
            }
        }
        
        // Ordenar por confiança (decrescente)
        std::sort(detected_patterns.begin(), detected_patterns.end(),
                 [](const json& a, const json& b) {
                     return a["confidence"] > b["confidence"];
                 });
        
        result["detected_patterns"] = detected_patterns;
        result["all_scores"] = pattern_scores;
        
        return result;
    }

    // Sugere respostas para padrões detectados
    json suggest_responses(const std::string& pattern_id) {
        json result;
        
        // Mapeamento de padrões para respostas sugeridas
        std::map<std::string, std::vector<std::string>> pattern_responses = {
            {"anchoring", {
                "Reconheça a âncora, mas baseie a discussão em critérios objetivos",
                "Questione os pressupostos por trás da âncora inicial",
                "Apresente sua própria âncora em direção oposta"
            }},
            {"nibbling", {
                "Estabeleça claramente que o acordo principal está fechado",
                "Peça algo em troca para cada concessão adicional",
                "Identifique o padrão e aborde-o diretamente"
            }},
            {"good_cop_bad_cop", {
                "Insista em negociar com o tomador de decisão final",
                "Reconheça a tática abertamente",
                "Separe as pessoas do problema e foque nos interesses"
            }},
            {"deadline_pressure", {
                "Questione a realidade do prazo",
                "Estabeleça seu próprio cronograma",
                "Prepare alternativas caso não chegue a um acordo no prazo"
            }},
            {"limited_authority", {
                "Peça para falar com quem tem autoridade",
                "Condicione concessões à aprovação final de ambos os lados",
                "Estabeleça um processo de aprovação claro"
            }},
            {"emotional_appeal", {
                "Reconheça as emoções, mas mantenha o foco em fatos objetivos",
                "Faça perguntas para trazer a discussão de volta aos interesses",
                "Sugira uma pausa se as emoções estiverem muito intensas"
            }},
            {"take_it_or_leave_it", {
                "Teste o ultimato pedindo pequenas modificações",
                "Explore os interesses por trás da posição inflexível",
                "Apresente consequências de não chegar a um acordo"
            }},
            {"bogey", {
                "Peça justificativas para a baixa valorização do item",
                "Ofereça remover o item em troca de concessão significativa",
                "Demonstre o valor real com dados objetivos"
            }},
            {"decoy", {
                "Foque apenas nas opções relevantes para seus interesses",
                "Compare cada opção com critérios objetivos",
                "Questione a relevância das alternativas apresentadas"
            }},
            {"highball_lowball", {
                "Estabeleça faixas de negociação razoáveis desde o início",
                "Peça justificativas detalhadas para a oferta extrema",
                "Responda com dados de mercado e critérios objetivos"
            }}
        };
        
        if (pattern_responses.find(pattern_id) != pattern_responses.end()) {
            result["responses"] = pattern_responses[pattern_id];
        } else {
            result["responses"] = json::array();
        }
        
        return result;
    }
};

// Função principal para demonstração
extern "C" {
    // Função para análise de texto
    const char* analyze_negotiation_text(const char* text) {
        static std::string result_str;
        
        try {
            TextAnalyzer analyzer;
            json result = analyzer.analyze_text(text);
            result_str = result.dump();
            return result_str.c_str();
        } catch (const std::exception& e) {
            json error = {{
                "error", true
            }, {
                "message", e.what()
            }};
            result_str = error.dump();
            return result_str.c_str();
        }
    }
    
    // Função para cronometrar exercícios
    const char* start_exercise_timer(const char* exercise_id) {
        static PrecisionTimer timer;
        static std::string current_exercise;
        static std::string result_str;
        
        try {
            current_exercise = exercise_id;
            timer.start();
            
            json result = {{
                "status", "started"
            }, {
                "exercise_id", current_exercise
            }, {
                "timestamp", std::chrono::system_clock::now().time_since_epoch().count()
            }};
            
            result_str = result.dump();
            return result_str.c_str();
        } catch (const std::exception& e) {
            json error = {{
                "error", true
            }, {
                "message", e.what()
            }};
            result_str = error.dump();
            return result_str.c_str();
        }
    }
    
    // Função para parar o cronômetro e registrar o tempo
    const char* stop_exercise_timer() {
        static PrecisionTimer timer;
        static std::string current_exercise;
        static std::string result_str;
        static PerformanceAnalyzer performance_analyzer;
        
        try {
            timer.stop();
            double elapsed = timer.elapsed_seconds();
            
            // Registrar o tempo no analisador de performance
            if (!current_exercise.empty()) {
                performance_analyzer.record_exercise_time(current_exercise, elapsed);
            }
            
            json result = {{
                "status", "stopped"
            }, {
                "exercise_id", current_exercise
            }, {
                "elapsed_seconds", elapsed
            }, {
                "timestamp", std::chrono::system_clock::now().time_since_epoch().count()
            }};
            
            current_exercise = "";  // Limpar o exercício atual
            result_str = result.dump();
            return result_str.c_str();
        } catch (const std::exception& e) {
            json error = {{
                "error", true
            }, {
                "message", e.what()
            }};
            result_str = error.dump();
            return result_str.c_str();
        }
    }
    
    // Função para detectar padrões de negociação
    const char* detect_negotiation_patterns(const char* text) {
        static std::string result_str;
        
        try {
            NegotiationPatternAnalyzer analyzer;
            json result = analyzer.analyze_patterns(text);
            result_str = result.dump();
            return result_str.c_str();
        } catch (const std::exception& e) {
            json error = {{
                "error", true
            }, {
                "message", e.what()
            }};
            result_str = error.dump();
            return result_str.c_str();
        }
    }
    
    // Função para obter estatísticas de performance
    const char* get_performance_stats(const char* exercise_id) {
        static std::string result_str;
        static PerformanceAnalyzer performance_analyzer;
        
        try {
            json result;
            if (exercise_id && strlen(exercise_id) > 0) {
                result = performance_analyzer.get_exercise_stats(exercise_id);
            } else {
                result = performance_analyzer.get_all_stats();
            }
            
            result_str = result.dump();
            return result_str.c_str();
        } catch (const std::exception& e) {
            json error = {{
                "error", true
            }, {
                "message", e.what()
            }};
            result_str = error.dump();
            return result_str.c_str();
        }
    }
}

// Função main para testes locais
int main() {
    std::cout << "Módulo C++ de Processamento de Negociação" << std::endl;
    std::cout << "Este módulo é compilado como uma biblioteca compartilhada" << std::endl;
    std::cout << "para ser utilizado pelo backend Python." << std::endl;
    
    return 0;
}
