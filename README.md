# Universo AL (Adrielle & Luca)

Universo AL é um jogo 2D casual desenvolvido em HTML, CSS e JavaScript, criado para celebrar a dupla Adrielle & Luca e os seus amigos animais. A aventura acontece numa noite estrelada em Cabo Verde: protege o gato Nuvem e o cão Sol, derruba naves invasoras e mantém a maior pontuação possível.

## 🎮 Como jogar

1. **Instalação**
   - Não é preciso build. Basta clonar ou descarregar este repositório.
   - Certifica-te de que a pasta ssets/ permanece no mesmo nível de index.html.

2. **Arranque**
   - Abre index.html directamente no navegador (Chrome/Edge/Firefox). Para uma experiência sem restrições de áudio, recomenda‑se servir a pasta com um servidor local simples, como:
     `ash
     npx serve .
     # ou
     python -m http.server 5500
     `
   - Acede ao endereço local indicado (por exemplo, http://localhost:5500).
   - Clica em **Iniciar** para desbloquear o áudio e começar a onda de naves.

3. **Controlos**
   - Movimento: Setas ou WASD
   - Salto: Seta ↑ ou W
   - Disparo da personagem: Espaço
   - Trocar entre Adrielle e Luca: S
   - Disparo dos animais (manual): Shift
   - Disparo combinado personagem + animais: Shift + Espaço
   - Auto-fogo dos animais: toca Shift duas vezes para activar/desactivar

## 🧩 Mecânicas principais

- As naves inimigas aparecem em ondas crescentes com trajectórias rectas ou em zig-zag.
- Cada nave possui 2 pontos de vida; Adrielle/Luca causam 2 de dano por tiro, os animais causam 1.
- O gato Nuvem e o cão Sol acompanham a personagem e precisam ser protegidos; se uma nave os atingir, perdes vida.
- Sistema de pontuação com registo do melhor score (guardado em localStorage).
- HUD sempre visível com pontuação, high-score, vidas e personagem activa.
- Modo auto-fogo para os animais (toggle com duplo Shift).

## 🗂️ Estrutura do projecto

`
.
├── assets/
│   ├── adrielle.svg       # Sprite da Adrielle
│   ├── luca.svg           # Sprite do Luca
│   ├── cat.svg / dog.svg  # Companheiros
│   ├── ship.svg / explosion.svg
│   ├── logo.svg / heart.svg
│   ├── tree.svg / house.svg
│   └── *.wav              # Efeitos e música ambiente
├── game.js                # Lógica do jogo, spawn e render
├── style.css              # Layout, HUD e cenário nocturno
├── index.html             # Estrutura base e ligação aos assets
└── README.md
`

## ✨ Destaques visuais

- Cenário nocturno animado com estrelas cintilantes, montanhas e lua com halo.
- Sprites autorais para Adrielle, Luca, gato e cão.
- HUD responsiva ao lado do canvas, sem necessidade de scroll.

## 📦 Tecnologias

- HTML5 Canvas
- CSS3 (gradientes, layout responsivo)
- JavaScript ES6 (render loop, colisões, áudio)

## 🤝 Contribuições

Feedbacks, issues e pull requests são bem-vindos! Sente-te à vontade para sugerir novas mecânicas, ajustar o equilíbrio das ondas ou criar novos assets.

**Divirte-te a proteger o Universo AL!**
