import { Agent, callable } from "agents";

export class CounterAgent extends Agent {
	initialState = { count: 0 };

	@callable()
	increment() {
		this.setState({ count: this.state.count + 1 });
		return this.state.count;
	}

	@callable()
	decrement() {
		this.setState({ count: this.state.count - 1 });
		return this.state.count;
	}
}