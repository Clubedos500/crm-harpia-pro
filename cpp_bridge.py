#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import json
import ctypes
from ctypes import c_char_p
from typing import Dict, List, Union, Optional, Any

# Definir o caminho para a biblioteca compartilhada
LIB_PATH = os.path.join(os.path.dirname(__file__), 'lib', 'negotiation_processor')

# Adicionar extensão apropriada com base no sistema operacional
if sys.platform.startswith('win'):
    LIB_PATH += '.dll'
elif sys.platform.startswith('darwin'):
    LIB_PATH += '.dylib'
else:  # Linux e outros sistemas Unix
    LIB_PATH += '.so'

# Classe para gerenciar a interface com o módulo C++
class NegotiationProcessor:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(NegotiationProcessor, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        """Inicializa a biblioteca C++ e configura as funções."""
        try:
            # Carregar a biblioteca compartilhada
            self.lib = ctypes.CDLL(LIB_PATH)
            
            # Configurar os tipos de retorno e argumentos para as funções C++
            self._setup_functions()
            self.initialized = True
            print(f"Módulo C++ carregado com sucesso: {LIB_PATH}")
        except Exception as e:
            self.initialized = False
            print(f"Erro ao carregar o módulo C++: {e}")
            print("Usando implementação de fallback em Python")
    
    def _setup_functions(self):
        """Configura os tipos de retorno e argumentos para as funções C++."""
        if not hasattr(self, 'lib'):
            return
        
        # Função para análise de texto
        self.lib.analyze_negotiation_text.restype = c_char_p
        self.lib.analyze_negotiation_text.argtypes = [c_char_p]
        
        # Funções para cronômetro
        self.lib.start_exercise_timer.restype = c_char_p
        self.lib.start_exercise_timer.argtypes = [c_char_p]
        
        self.lib.stop_exercise_timer.restype = c_char_p
        self.lib.stop_exercise_timer.argtypes = []
        
        # Função para detecção de padrões
        self.lib.detect_negotiation_patterns.restype = c_char_p
        self.lib.detect_negotiation_patterns.argtypes = [c_char_p]
        
        # Função para estatísticas de performance
        self.lib.get_performance_stats.restype = c_char_p
        self.lib.get_performance_stats.argtypes = [c_char_p]
    
    def analyze_text(self, text: str) -> Dict[str, Any]:
        """Analisa um texto de negociação e retorna métricas.
        
        Args:
            text: O texto a ser analisado
            
        Returns:
            Dicionário com métricas de análise do texto
        """
        if not self.initialized:
            return self._fallback_analyze_text(text)
        
        try:
            result = self.lib.analyze_negotiation_text(text.encode('utf-8'))
            return json.loads(result.decode('utf-8'))
        except Exception as e:
            print(f"Erro na análise de texto: {e}")
            return self._fallback_analyze_text(text)
    
    def start_timer(self, exercise_id: str) -> Dict[str, Any]:
        """Inicia um cronômetro para um exercício.
        
        Args:
            exercise_id: Identificador do exercício
            
        Returns:
            Dicionário com status do cronômetro
        """
        if not self.initialized:
            return self._fallback_start_timer(exercise_id)
        
        try:
            result = self.lib.start_exercise_timer(exercise_id.encode('utf-8'))
            return json.loads(result.decode('utf-8'))
        except Exception as e:
            print(f"Erro ao iniciar cronômetro: {e}")
            return self._fallback_start_timer(exercise_id)
    
    def stop_timer(self) -> Dict[str, Any]:
        """Para o cronômetro atual e retorna o tempo decorrido.
        
        Returns:
            Dicionário com tempo decorrido e status
        """
        if not self.initialized:
            return self._fallback_stop_timer()
        
        try:
            result = self.lib.stop_exercise_timer()
            return json.loads(result.decode('utf-8'))
        except Exception as e:
            print(f"Erro ao parar cronômetro: {e}")
            return self._fallback_stop_timer()
    
    def detect_patterns(self, text: str) -> Dict[str, Any]:
        """Detecta padrões de negociação em um texto.
        
        Args:
            text: O texto a ser analisado
            
        Returns:
            Dicionário com padrões detectados e pontuações
        """
        if not self.initialized:
            return self._fallback_detect_patterns(text)
        
        try:
            result = self.lib.detect_negotiation_patterns(text.encode('utf-8'))
            return json.loads(result.decode('utf-8'))
        except Exception as e:
            print(f"Erro na detecção de padrões: {e}")
            return self._fallback_detect_patterns(text)
    
    def get_performance_stats(self, exercise_id: Optional[str] = None) -> Dict[str, Any]:
        """Obtém estatísticas de performance para um exercício ou todos.
        
        Args:
            exercise_id: Identificador do exercício ou None para todos
            
        Returns:
            Dicionário com estatísticas de performance
        """
        if not self.initialized:
            return self._fallback_get_performance_stats(exercise_id)
        
        try:
            if exercise_id:
                result = self.lib.get_performance_stats(exercise_id.encode('utf-8'))
            else:
                result = self.lib.get_performance_stats(None)
            
            return json.loads(result.decode('utf-8'))
        except Exception as e:
            print(f"Erro ao obter estatísticas: {e}")
            return self._fallback_get_performance_stats(exercise_id)
    
    # Implementações de fallback em Python puro para quando o módulo C++ não está disponível
    
    def _fallback_analyze_text(self, text: str) -> Dict[str, Any]:
        """Implementação de fallback para análise de texto."""
        import re
        from collections import Counter
        
        # Listas simplificadas de palavras
        positive_words = ["acordo", "benefício", "colaboração", "ganho", "oportunidade", 
                         "parceria", "solução", "sucesso", "vantagem", "valor"]
        
        negative_words = ["conflito", "custo", "desvantagem", "disputa", "falha", 
                         "perda", "problema", "risco", "ruptura", "tensão"]
        
        power_words = ["certamente", "claramente", "definitivamente", "essencial", "exatamente", 
                      "garantido", "imperativo", "necessário", "precisamente", "vital"]
        
        collaborative_words = ["ambos", "compartilhar", "conjunto", "cooperação", "equipe", 
                             "juntos", "mútuo", "parceria", "reciprocidade", "sinergia"]
        
        # Normalizar texto
        normalized_text = text.lower()
        
        # Contar palavras
        words = re.findall(r'\b\w+\b', normalized_text)
        word_count = len(words)
        
        # Contar ocorrências
        positive_count = sum(1 for word in words if word in positive_words)
        negative_count = sum(1 for word in words if word in negative_words)
        power_count = sum(1 for word in words if word in power_words)
        collaborative_count = sum(1 for word in words if word in collaborative_words)
        
        # Calcular percentuais
        positive_ratio = positive_count / word_count if word_count > 0 else 0
        negative_ratio = negative_count / word_count if word_count > 0 else 0
        power_ratio = power_count / word_count if word_count > 0 else 0
        collaborative_ratio = collaborative_count / word_count if word_count > 0 else 0
        
        # Calcular pontuações
        tone_score = 0
        if positive_count + negative_count > 0:
            tone_score = (positive_count - negative_count) / (positive_count + negative_count)
        
        style_score = 0
        if power_count + collaborative_count > 0:
            style_score = (collaborative_count - power_count) / (power_count + collaborative_count)
        
        return {
            "word_count": word_count,
            "metrics": {
                "positive_words": positive_count,
                "negative_words": negative_count,
                "power_words": power_count,
                "collaborative_words": collaborative_count,
                "positive_ratio": positive_ratio,
                "negative_ratio": negative_ratio,
                "power_ratio": power_ratio,
                "collaborative_ratio": collaborative_ratio,
                "tone_score": tone_score,
                "style_score": style_score
            }
        }
    
    def _fallback_start_timer(self, exercise_id: str) -> Dict[str, Any]:
        """Implementação de fallback para iniciar cronômetro."""
        import time
        
        self._current_exercise = exercise_id
        self._start_time = time.time()
        
        return {
            "status": "started",
            "exercise_id": exercise_id,
            "timestamp": int(self._start_time * 1000)
        }
    
    def _fallback_stop_timer(self) -> Dict[str, Any]:
        """Implementação de fallback para parar cronômetro."""
        import time
        
        if not hasattr(self, '_start_time'):
            return {"error": True, "message": "Timer not started"}
        
        end_time = time.time()
        elapsed = end_time - self._start_time
        
        result = {
            "status": "stopped",
            "exercise_id": getattr(self, '_current_exercise', 'unknown'),
            "elapsed_seconds": elapsed,
            "timestamp": int(end_time * 1000)
        }
        
        # Limpar estado
        if hasattr(self, '_current_exercise'):
            delattr(self, '_current_exercise')
        if hasattr(self, '_start_time'):
            delattr(self, '_start_time')
        
        return result
    
    def _fallback_detect_patterns(self, text: str) -> Dict[str, Any]:
        """Implementação de fallback para detecção de padrões."""
        # Padrões simplificados
        patterns = {
            "anchoring": ["inicial", "oferta", "valor", "mercado", "comparável", "referência"],
            "nibbling": ["adicional", "pequeno", "mais um", "também", "incluir", "além disso"],
            "deadline_pressure": ["prazo", "tempo", "urgente", "amanhã", "hoje", "imediato"],
            "limited_authority": ["autorização", "superior", "consultar", "permissão", "limitado"],
            "take_it_or_leave_it": ["final", "última", "melhor", "impossível", "única", "opção"]
        }
        
        # Descrições dos padrões
        descriptions = {
            "anchoring": "Uso de âncora inicial extrema para influenciar percepção de valor",
            "nibbling": "Pedidos pequenos adicionais após acordo principal",
            "deadline_pressure": "Uso de prazos para forçar concessões",
            "limited_authority": "Alegação de autoridade limitada para decisão",
            "take_it_or_leave_it": "Apresentação de proposta final sem negociação"
        }
        
        # Normalizar texto
        normalized_text = text.lower()
        
        # Calcular pontuações
        scores = {}
        for pattern_id, keywords in patterns.items():
            count = sum(1 for keyword in keywords if keyword in normalized_text)
            score = count / len(keywords) if keywords else 0
            scores[pattern_id] = score
        
        # Detectar padrões com pontuação > 0.3
        detected = []
        for pattern_id, score in scores.items():
            if score > 0.3:
                detected.append({
                    "pattern_id": pattern_id,
                    "description": descriptions.get(pattern_id, "Padrão desconhecido"),
                    "confidence": score
                })
        
        # Ordenar por confiança
        detected.sort(key=lambda x: x["confidence"], reverse=True)
        
        return {
            "detected_patterns": detected,
            "all_scores": scores
        }
    
    def _fallback_get_performance_stats(self, exercise_id: Optional[str] = None) -> Dict[str, Any]:
        """Implementação de fallback para estatísticas de performance."""
        # Em uma implementação real, isso usaria um banco de dados
        # Aqui, apenas retornamos dados simulados
        
        if not hasattr(self, '_performance_data'):
            self._performance_data = {}
        
        if exercise_id:
            if exercise_id not in self._performance_data:
                return {"status": "no_data"}
            
            return {
                "status": "success",
                "count": 0,
                "stats": {
                    "mean": 0,
                    "min": 0,
                    "max": 0,
                    "std_dev": 0,
                    "trend": 0
                }
            }
        else:
            return {}

# Instância global para uso em toda a aplicação
negotiation_processor = NegotiationProcessor()

# Função para teste
def test_processor():
    """Testa as funcionalidades do processador de negociação."""
    processor = NegotiationProcessor()
    
    # Testar análise de texto
    text = """Estamos buscando uma parceria que traga benefícios mútuos. 
    Nossa oferta inicial é competitiva com o mercado, mas estamos abertos a 
    negociar para chegar a um acordo que seja vantajoso para ambas as partes."""
    
    print("\nTestando análise de texto...")
    result = processor.analyze_text(text)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    
    # Testar cronômetro
    print("\nTestando cronômetro...")
    start_result = processor.start_timer("batna")
    print("Cronômetro iniciado:", json.dumps(start_result, indent=2))
    
    # Simular algum processamento
    import time
    time.sleep(1.5)
    
    stop_result = processor.stop_timer()
    print("Cronômetro parado:", json.dumps(stop_result, indent=2))
    
    # Testar detecção de padrões
    print("\nTestando detecção de padrões...")
    pattern_text = """Esta é nossa oferta final. O prazo para aceitação é 
    amanhã ao meio-dia. Não podemos melhorar os termos, pois precisamos 
    de autorização do comitê para qualquer alteração adicional."""
    
    pattern_result = processor.detect_patterns(pattern_text)
    print(json.dumps(pattern_result, indent=2, ensure_ascii=False))

# Executar teste se o script for executado diretamente
if __name__ == "__main__":
    test_processor()
